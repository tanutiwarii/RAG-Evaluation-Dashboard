from sentence_transformers import SentenceTransformer

from langchain_community.document_loaders import (
    TextLoader
)

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

from langchain_community.retrievers import (
    BM25Retriever
)

from langchain.retrievers import (
    EnsembleRetriever
)

from langchain_community.vectorstores import (
    Chroma
)

from langchain.schema import Document

from app.services.llm_service import (
    LLMService
)

import time


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
            "data/company_policy.txt"
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

        # Add metadata
        for i, doc in enumerate(docs):

            doc.metadata["chunk_id"] = i

        print("Loading embedding model...")

        self.embeddings = (
            LocalEmbeddingFunction()
        )

        print("Creating vector store...")

        self.vectorstore = (
            Chroma.from_documents(
                docs,
                self.embeddings
            )
        )

        # Create retrievers
        self.setup_retriever()

        self.llm_service = LLMService()

        print(
            "RAG Pipeline initialized successfully."
        )

    def setup_retriever(self):

        vector_retriever = (
            self.vectorstore.as_retriever(
                search_type="mmr",
                search_kwargs={
                    "k": 4,
                    "fetch_k": 10
                }
            )
        )

        bm25_retriever = (
            BM25Retriever.from_documents(
                self.docs
            )
        )

        bm25_retriever.k = 4

        self.retriever = (
            EnsembleRetriever(

                retrievers=[
                    vector_retriever,
                    bm25_retriever
                ],

                weights=[0.7, 0.3]
            )
        )

    def load_pdf(
        self,
        pdf_text: str
    ):

        documents = [

            Document(
                page_content=pdf_text
            )

        ]

        chunks = (
            self.text_splitter.split_documents(
                documents
            )
        )

        self.docs = chunks

        # Add metadata
        for i, chunk in enumerate(chunks):

            chunk.metadata["chunk_id"] = i

        self.vectorstore = (
            Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings
            )
        )

        # Recreate hybrid retriever
        self.setup_retriever()

        print(
            "PDF indexed successfully."
        )

    async def ask(
        self,
        question: str
    ):

        retrieved_docs = (
            self.retriever.invoke(
                question
            )
        )

        unique_contexts = set()

        contexts = []

        for doc in retrieved_docs:

            if (
                doc.page_content
                not in unique_contexts
            ):

                unique_contexts.add(
                    doc.page_content
                )

                contexts.append({

                    "content": doc.page_content,

                    "score": "hybrid",

                    "chunk_id": doc.metadata.get(
                        "chunk_id"
                    )

                })

        context_texts = [

            context["content"]
            for context in contexts

        ]

        start_time = time.time()

        answer = await self.llm_service.generate_answer(

            question=question,

            contexts=context_texts
        )

        latency = (
            time.time() - start_time
        )

        return {

            "question": question,

            "answer": answer,

            "contexts": contexts,

            "latency": round(latency, 2)
        }