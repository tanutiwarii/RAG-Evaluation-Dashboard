from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter
)

from langchain_experimental.text_splitter import SemanticChunker
from app.rag.pipeline import LocalEmbeddingFunction
class ChunkingService:

    def fixed_chunking(
        self,
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ):

        splitter = CharacterTextSplitter(
            separator="",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        chunks = splitter.split_text(text)

        return chunks

    def recursive_chunking(
        self,
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ):

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        chunks = splitter.split_text(text)

        return chunks
    
    def semantic_chunking(self, text: str):

        embeddings = LocalEmbeddingFunction()

        splitter = SemanticChunker(
            embeddings
        )

        chunks = splitter.split_text(text)

        return chunks