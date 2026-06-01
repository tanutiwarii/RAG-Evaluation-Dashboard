from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rag_instance import get_rag_pipeline
from app.db.supabase_client import supabase
from fastapi import APIRouter

from app.evaluators.ragas_evaluator import (
    evaluate_rag
)

from app.dependencies import get_db

from app.models.evaluation import Evaluation
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.post("/ask")
async def ask_question(
    request: dict,
    db: Session = Depends(get_db)
):

    question = request["question"]

    rag_pipeline = get_rag_pipeline()

    if rag_pipeline is None:
        return {
            "error": "Pipeline mode is disabled in light deployment."
        }

    result = await rag_pipeline.ask(question)


    metrics = await evaluate_rag(
        question=question,
        answer=result["answer"],
        contexts=result["contexts"]
    )
    metrics["latency"] = result["latency"]

    evaluation = Evaluation(

        question=question,

        answer=result["answer"],

        faithfulness=metrics["faithfulness"],

        answer_relevancy=metrics["answer_relevancy"],

        context_precision=metrics["context_precision"],

        context_recall=metrics["context_recall"],

        answer_correctness = metrics["answer_correctness"],

        latency=metrics["latency"])

    db.add(evaluation)

    db.commit()

    return {

        "question": question,

        "answer": result["answer"],

        "contexts": result["contexts"],

        "metrics": metrics
    }
@router.get("/evaluations")
async def get_evaluations():

    response = (
        supabase.table("evaluations")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data

@router.post("/ask-stream")
async def ask_question_stream(
    request: dict
):

    question = request["question"]

    rag_pipeline = get_rag_pipeline()

    if rag_pipeline is None:
        return {
            "error": "Pipeline mode is disabled in light deployment."
        }

    return StreamingResponse(
        rag_pipeline.ask_stream(question),
        media_type="text/plain"
    )
