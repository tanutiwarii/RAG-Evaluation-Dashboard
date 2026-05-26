from sentence_transformers import SentenceTransformer

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

from app.services.llm_service import LLMService
import time

class LocalEmbeddingFunction:

    def __init__(self):
        self.model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    def embed_documents(self, texts):
        return self.model.encode(texts).tolist()

    def embed_query(self, text):
        return self.model.encode(text).tolist()


class RAGPipeline:

    def __init__(self):

        print("Loading documents...")

        loader = TextLoader("data/company_policy.txt")
        documents = loader.load()

        print("Splitting documents...")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )

        docs = splitter.split_documents(documents)

        print("Loading embedding model...")

        embeddings = LocalEmbeddingFunction()

        print("Creating vector store...")

        vectorstore = Chroma.from_documents(
            docs,
            embeddings
        )

        self.retriever = vectorstore.as_retriever()

        self.llm_service = LLMService()

        print("RAG Pipeline initialized successfully.")

    async def ask(self, question: str):

        retrieved_docs = self.retriever.invoke(question)

        contexts = [
            doc.page_content
            for doc in retrieved_docs
        ]

        start_time = time.time()
        answer = await self.llm_service.generate_answer(
            question=question,
            contexts=contexts
        )
        latency = time.time() - start_time
        return {
            "question": question,
            "answer": answer,
            "contexts": contexts,
            "latency": round(latency, 2)
        }