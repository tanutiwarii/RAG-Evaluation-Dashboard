from sentence_transformers import (
    SentenceTransformer,
    CrossEncoder
)

from langchain_community.document_loaders import (
    TextLoader
)

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

from langchain_community.retrievers import (
    BM25Retriever
)

from langchain_community.vectorstores import (
    Chroma
)

from langchain_core.documents import (
    Document
)

from app.services.llm_service import (
    LLMService
)
from langsmith import traceable
import time
import asyncio

class LocalEmbeddingFunction:

    def __init__(self):

        self.model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    def embed_documents(self, texts):

        return self.model.encode(
            texts
        ).tolist()

    def embed_query(self, text):

        return self.model.encode(
            text
        ).tolist()


class RAGPipeline:

    def __init__(self):

        print("Loading documents...")

        loader = TextLoader(
            "app/data/company_policy.txt"
        )

        documents = loader.load()

        print("Splitting documents...")

        self.text_splitter = (
            RecursiveCharacterTextSplitter(
                chunk_size=800,
                chunk_overlap=150
            )
        )

        docs = self.text_splitter.split_documents(
            documents
        )

        self.docs = docs

        self.loaded_documents = [
            "company_policy.txt"
        ]

        # Add metadata
        for i, doc in enumerate(docs):

            doc.metadata["chunk_id"] = i

            doc.metadata["source"] = (
                "company_policy.txt"
            )

        print("Loading embedding model...")

        self.embeddings = (
            LocalEmbeddingFunction()
        )

        print("Loading reranker model...")

        self.reranker = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2"
        )

        print("Creating vector store...")
        self.vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=self.embeddings,
            persist_directory="chroma_db"
        )
        self.vectorstore.persist()

        # Create retrievers
        self.setup_retriever()

        self.llm_service = LLMService()

        print(
            "RAG Pipeline initialized successfully."
        )

    def setup_retriever(self):

        self.vector_retriever = (
            self.vectorstore.as_retriever(
                search_type="mmr",
                search_kwargs={
                    "k": 4,
                    "fetch_k": 10
                }
            )
        )

        self.bm25_retriever = (
            BM25Retriever.from_documents(
                self.docs
            )
        )

        self.bm25_retriever.k = 4

    def load_pdf(
        self,
        pdf_text: str,
        source_name: str
    ):

        documents = [

            Document(
                page_content=pdf_text,
                metadata={
                    "source": source_name
                }
            )

        ]

        chunks = (
            self.text_splitter.split_documents(
                documents
            )
        )

        start_chunk_id = len(self.docs)

        for i, chunk in enumerate(chunks):

            chunk.metadata["chunk_id"] = (
                start_chunk_id + i
            )

            chunk.metadata["source"] = (
                source_name
            )

        # Store docs in memory
        self.docs.extend(chunks)

        # Track uploaded docs
        if (
            source_name
            not in self.loaded_documents
        ):

            self.loaded_documents.append(
                source_name
            )

        # Append to vector DB
        self.vectorstore.add_documents(
            chunks
        )
        self.vectorstore.persist()

        # Rebuild retriever
        self.setup_retriever()

        print(
            f"{source_name} indexed successfully."
        )

    def get_loaded_documents(self):

        return self.loaded_documents

    def clear_knowledge_base(self):

        empty_doc = Document(
            page_content="Knowledge base is empty.",
            metadata={
                "source": "empty",
                "chunk_id": 0
            }
        )

        self.docs = [empty_doc]

        self.loaded_documents = []

        self.vectorstore = Chroma.from_documents(
            documents=[empty_doc],
            embedding=self.embeddings,
            persist_directory="chroma_db"
        )

        self.setup_retriever()

        print("Knowledge base cleared.")

    def remove_document(
        self,
        source_name: str
    ):

        self.loaded_documents = [

            doc
            for doc in self.loaded_documents
            if doc != source_name
        ]

        print(
            f"{source_name} removed from registry."
        )
    async def ask_stream(self, question: str):

        vector_docs = self.vector_retriever.invoke(question)
        bm25_docs = self.bm25_retriever.invoke(question)

        retrieved_docs = []

        seen = set()

        for doc in vector_docs + bm25_docs:

            if doc.page_content not in seen:

                seen.add(doc.page_content)

                retrieved_docs.append(doc)

        rerank_pairs = [
            (question, doc.page_content)
            for doc in retrieved_docs
        ]

        scores = self.reranker.predict(rerank_pairs)

        ranked_docs = sorted(
            zip(retrieved_docs, scores),
            key=lambda x: x[1],
            reverse=True
        )

        top_docs = [
            item for item in ranked_docs
            if item[1] > 0
        ][:3]

        if not top_docs:
            top_docs = ranked_docs[:1]

        contexts = [
            doc.page_content
            for doc, score in top_docs
        ]
        async for token in self.llm_service.stream_answer(
            question=question,
            contexts=contexts
        ):
            yield token
            await asyncio.sleep(0.03)
    @traceable(name="rag_pipeline")
    async def ask(
        self,
        question: str
    ):

        # Retrieve docs
        vector_docs = self.vector_retriever.invoke(question)
        bm25_docs = self.bm25_retriever.invoke(question)

        retrieved_docs = []

        seen = set()

        for doc in vector_docs + bm25_docs:

            if doc.page_content not in seen:

                seen.add(doc.page_content)

                retrieved_docs.append(doc)

        # Prepare reranker input
        rerank_pairs = [

            (
                question,
                doc.page_content
            )

            for doc in retrieved_docs
        ]

        # Rerank
        scores = (
            self.reranker.predict(
                rerank_pairs
            )
        )

        ranked_docs = sorted(

            zip(
                retrieved_docs,
                scores
            ),

            key=lambda x: x[1],

            reverse=True
        )

        # Keep only strong chunks
        top_docs = [

            item
            for item in ranked_docs
            if item[1] > 0

        ][:3]

        # Fallback
        if not top_docs:

            top_docs = ranked_docs[:1]

        unique_contexts = set()

        contexts = []

        for doc, score in top_docs:

            if (
                doc.page_content
                not in unique_contexts
            ):

                unique_contexts.add(
                    doc.page_content
                )

                contexts.append({

                    "content": (
                        doc.page_content
                    ),

                    "score": round(
                        float(score),
                        3
                    ),

                    "chunk_id": (
                        doc.metadata.get(
                            "chunk_id"
                        )
                    ),

                    "source": (
                        doc.metadata.get(
                            "source",
                            "unknown"
                        )
                    )
                })

        context_texts = [

            context["content"]
            for context in contexts

        ]

        start_time = time.time()

        answer = await (
            self.llm_service.generate_answer(

                question=question,

                contexts=context_texts
            )
        )

        latency = (
            time.time() - start_time
        )

        return {

            "question": question,

            "answer": answer,

            "contexts": contexts,

            "latency": round(
                latency,
                2
            )
        }

