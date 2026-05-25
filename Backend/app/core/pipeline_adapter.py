import asyncio
import logging
from functools import partial
from typing import Optional

import httpx

from app.core.chunking import ChunkStrategy
from app.core.rag_pipeline import build_pipeline

logger = logging.getLogger(__name__)


class PipelineRunner:
    async def run(self, question: str) -> dict:
        raise NotImplementedError


class InternalPipelineRunner(PipelineRunner):
    def __init__(
        self,
        pdf_path: str,
        pipeline_name: str,
        chunk_strategy: ChunkStrategy = ChunkStrategy.RECURSIVE,
        retriever_mode: str = "rerank",
        top_k_fetch: int = 20,
        top_n_return: int = 4,
        llm_model: str = "gpt-4o-mini",
    ):
        self.pdf_path = pdf_path
        self.pipeline_name = pipeline_name
        self.chunk_strategy = chunk_strategy
        self.retriever_mode = retriever_mode
        self.top_k_fetch = top_k_fetch
        self.top_n_return = top_n_return
        self.llm_model = llm_model
        self.pipeline = build_pipeline(
            pdf_path=self.pdf_path,
            pipeline_name=self.pipeline_name,
            chunk_strategy=self.chunk_strategy,
            retriever_mode=self.retriever_mode,
            top_k_fetch=self.top_k_fetch,
            top_n_return=self.top_n_return,
            llm_model=self.llm_model,
        )

    async def run(self, question: str) -> dict:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, partial(self.pipeline, {"query": question}))


class ExternalPipelineRunner(PipelineRunner):
    def __init__(
        self,
        endpoint: str,
        headers: Optional[dict[str, str]] = None,
        timeout_seconds: float = 30.0,
    ):
        self.endpoint = endpoint
        self.headers = headers or {}
        self.timeout_seconds = timeout_seconds

    async def run(self, question: str) -> dict:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(
                self.endpoint,
                json={"question": question},
                headers=self.headers,
            )
            response.raise_for_status()
            payload = response.json()

        answer = payload.get("result") or payload.get("answer") or payload.get("response")
        if not isinstance(answer, str):
            raise ValueError(
                "External pipeline response must include a string field 'answer', 'result', or 'response'."
            )

        source_documents = []
        if "source_documents" in payload:
            raw_docs = payload["source_documents"]
            if not isinstance(raw_docs, list):
                raise ValueError("External pipeline 'source_documents' must be a list.")
            for doc in raw_docs:
                if isinstance(doc, str):
                    source_documents.append({"page_content": doc})
                elif isinstance(doc, dict) and "page_content" in doc:
                    source_documents.append(doc)
                else:
                    raise ValueError(
                        "Each item in 'source_documents' must be either a string or an object with 'page_content'."
                    )
        elif "contexts" in payload:
            contexts = payload["contexts"]
            if not isinstance(contexts, list):
                raise ValueError("External pipeline 'contexts' must be a list of strings.")
            for ctx in contexts:
                if not isinstance(ctx, str):
                    raise ValueError("Each context must be a string.")
                source_documents.append({"page_content": ctx})
        else:
            raise ValueError(
                "External pipeline response must include either 'source_documents' or 'contexts'."
            )

        return {
            "result": answer,
            "source_documents": source_documents,
        }
