from fastapi import APIRouter
import time
import uuid
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from app.rag.pipeline import LocalEmbeddingFunction
from app.services.llm_service import LLMService
from app.evaluators.ragas_evaluator import evaluate_rag
from app.services.chunking_service import (
    ChunkingService
)
from app.utils.history_store import (
    save_run,
    create_run_entry
)
router = APIRouter()

chunking_service = ChunkingService()


@router.post("/chunking/test")
async def test_chunking(
    request: dict
):

    text = request["text"]

    strategy = request["strategy"]

    chunk_size = request.get(
        "chunk_size",
        500
    )

    chunk_overlap = request.get(
        "chunk_overlap",
        50
    )

    if strategy == "fixed":

        chunks = (
            chunking_service.fixed_chunking(
                text=text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
        )

    elif strategy == "recursive":

        chunks = (
            chunking_service.recursive_chunking(
                text=text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
        )
    elif strategy == "semantic":

        chunks = (
            chunking_service.semantic_chunking(
                text=text
            )
        )
    else:

        return {
            "error":
            "Invalid strategy"
        }

    return {

        "strategy": strategy,

        "chunk_count": len(chunks),

        "chunks": chunks
    }

@router.post("/chunking/evaluate")
async def evaluate_chunking(
    request: dict
):

    text = request["text"]
    question = request["question"]
    strategy = request["strategy"]
    ground_truth = request.get(
        "ground_truth",
        ""
    )

    chunk_size = request.get(
        "chunk_size",
        500
    )

    chunk_overlap = request.get(
        "chunk_overlap",
        50
    )

    if strategy == "fixed":

        chunks = chunking_service.fixed_chunking(
            text=text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

    elif strategy == "recursive":

        chunks = chunking_service.recursive_chunking(
            text=text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
    elif strategy == "semantic":

        chunks = (
            chunking_service.semantic_chunking(
                text=text
            )
        )

    else:

        return {
            "error": "Invalid strategy"
        }

    documents = [

        Document(
            page_content=chunk,
            metadata={
                "chunk_id": index,
                "strategy": strategy
            }
        )

        for index, chunk in enumerate(chunks)
    ]

    embeddings = LocalEmbeddingFunction()

    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        collection_name=f"chunking_eval_{uuid.uuid4().hex}"
    )

    retrieved_docs_with_scores = (
        vectorstore.similarity_search_with_score(
            question,
            k=3
        )
    )

    seen = set()
    contexts = []

    for rank, (doc, score) in enumerate(
        retrieved_docs_with_scores,
        start=1
    ):

        if doc.page_content in seen:
            continue

        seen.add(doc.page_content)

        contexts.append({
            "content": doc.page_content,
            "chunk_id": doc.metadata.get("chunk_id"),
            "strategy": strategy,
            "rank": rank,
            "score": round(float(score), 4)
        })

    context_texts = [
        context["content"]
        for context in contexts
    ]

    llm_service = LLMService()

    start_time = time.time()

    answer = await llm_service.generate_answer(
        question=question,
        contexts=context_texts
    )

    latency = round(
        time.time() - start_time,
        2
    )

    metrics = await evaluate_rag(
        question=question,
        answer=answer,
        contexts=contexts,
        ground_truth=ground_truth
    )

    metrics["latency"] = latency

    return {
        "strategy": strategy,
        "chunk_count": len(chunks),
        "answer": answer,
        "contexts": contexts,
        "metrics": metrics
    }

@router.post("/chunking/compare")
async def compare_chunking(
    request: dict
):

    text = request["text"]
    question = request["question"]

    ground_truth = request.get(
        "ground_truth",
        ""
    )

    chunk_size = request.get(
        "chunk_size",
        500
    )

    chunk_overlap = request.get(
        "chunk_overlap",
        50
    )

    async def run_strategy(strategy: str):

        result = await evaluate_chunking({
            "text": text,
            "question": question,
            "ground_truth": ground_truth,
            "strategy": strategy,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap
        })

        return result

    fixed_result = await run_strategy("fixed")

    recursive_result = await run_strategy("recursive")

    semantic_result = await run_strategy("semantic")

    def score(result):

        metrics = result["metrics"]

        return (
            metrics["faithfulness"] +
            metrics["answer_relevancy"] +
            metrics["context_precision"] +
            metrics["context_recall"] +
            metrics["answer_correctness"] -
            metrics["latency"] * 0.05
        )

    scores = [
        {
            "name": "Fixed Chunking",
            "value": score(fixed_result)
        },
        {
            "name": "Recursive Chunking",
            "value": score(recursive_result)
        },
        {
            "name": "Semantic Chunking",
            "value": score(semantic_result)
        }
    ]

    winner = sorted(
        scores,
        key=lambda item: item["value"],
        reverse=True
    )[0]["name"]

    run_entry = create_run_entry(
        question=question,
        ground_truth=ground_truth,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        fixed=fixed_result,
        recursive=recursive_result,
        semantic=semantic_result,
        winner=winner
    )

    save_run(run_entry)

    return {
        "winner": winner,
        "fixed": fixed_result,
        "recursive": recursive_result,
        "semantic": semantic_result
    }

@router.get("/history")
async def get_history(
    page: int = 1,
    limit: int = 10
):
    from app.utils.history_store import load_history

    return load_history(
        page=page,
        limit=limit
    )

@router.delete("/history")
async def clear_history_route():

    from app.utils.history_store import clear_history

    clear_history()

    return {
        "message": "History cleared successfully"
    }
@router.delete("/history/{run_id}")
async def delete_history_run(run_id: str):

    from app.utils.history_store import delete_run

    delete_run(run_id)

    return {
        "message": "Run deleted successfully",
        "run_id": run_id
    }# redeploy
