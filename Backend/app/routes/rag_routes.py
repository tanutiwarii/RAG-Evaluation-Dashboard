from fastapi import APIRouter, HTTPException

from app.rag.pipeline import RAGPipeline

from app.schemas.rag_schema import (
    AskRequest,
    AskResponse
)

from app.evaluators.ragas_evaluator import (
    RAGASEvaluator
)

router = APIRouter()

rag_pipeline = RAGPipeline()

ragas_evaluator = RAGASEvaluator()


@router.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):

    try:

        rag_result = await rag_pipeline.ask(
            request.question
        )

        metrics = await ragas_evaluator.evaluate_response(
            question=rag_result["question"],
            answer=rag_result["answer"],
            contexts=rag_result["contexts"],
            latency=rag_result["latency"]
        )
        return {
            **rag_result,
            "metrics": metrics
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )