from app.evaluators.ragas_evaluator import evaluate_rag
from app.services.job_manager import update_job
import time
from app.routes.rag_routes import rag_pipeline
def format_contexts(contexts):

    formatted_contexts = []

    for index, context in enumerate(contexts):

        if isinstance(context, dict):

            formatted_contexts.append({
                "content": context.get("content", ""),
                "chunk_id": context.get("chunk_id", index),
                "strategy": context.get("strategy", "manual"),
                "rank": context.get("rank", index + 1),
                "score": context.get("score", 0)
            })

        else:

            formatted_contexts.append({
                "content": context,
                "chunk_id": index,
                "strategy": "manual",
                "rank": index + 1,
                "score": 0
            })

    return formatted_contexts


async def run_single_evaluation(item: dict):

    question = item["question"]
    answer = item["answer"]
    contexts = item.get("contexts", [])
    ground_truth = item.get("ground_truth", "")

    formatted_contexts = format_contexts(contexts)

    start_time = time.time()

    metrics = await evaluate_rag(
        question=question,
        answer=answer,
        contexts=formatted_contexts,
        ground_truth=ground_truth
    )

    metrics["latency"] = round(
        time.time() - start_time,
        4
    )

    return {
        "question": question,
        "answer": answer,
        "ground_truth": ground_truth,
        "contexts": formatted_contexts,
        "metrics": metrics
    }

async def run_batch_evaluation(
    items: list,
    job_id: str = None,
    mode: str ="manual"
):

    results = []

    for index, item in enumerate(items):

        if mode == "pipeline":

            pipeline_result = await rag_pipeline.ask(
                item["question"]
            )

            evaluation_item = {
                "question": item["question"],
                "answer": pipeline_result["answer"],
                "contexts": pipeline_result["contexts"],
                "ground_truth": item.get(
                    "ground_truth",
                    ""
                )
            }

            result = await run_single_evaluation(
                evaluation_item
            )

        else:

            result = await run_single_evaluation(
                item
            )

        results.append({
            "index": index,
            **result
        })

        if job_id:
            update_job(
                job_id,
                progress=index + 1,
                total=len(items),
                current_question=item.get("question", "")
            )

    if not results:
        return {
            "count": 0,
            "results": [],
            "aggregate_metrics": {}
        }

    metric_keys = [
        "faithfulness",
        "answer_relevancy",
        "context_precision",
        "context_recall",
        "answer_correctness",
        "latency"
    ]

    aggregate_metrics = {}

    for key in metric_keys:

        aggregate_metrics[key] = round(
            sum(
                result["metrics"].get(key, 0)
                for result in results
            ) / len(results),
            2
        )

    return {
        "count": len(results),
        "results": results,
        "aggregate_metrics": aggregate_metrics
    }