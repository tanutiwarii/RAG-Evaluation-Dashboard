"""
eval/run_eval.py

Standalone CLI script to run a full evaluation without the API.
Useful for quick testing and CI pipelines.

Usage:
    python eval/run_eval.py --pdf path/to/doc.pdf --strategy recursive --retriever rerank
"""

import asyncio
import argparse
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.rag_pipeline import build_pipeline
from app.core.chunking import ChunkStrategy
from app.core.ragas_runner import evaluate_single, aggregate_scores
from app.schemas.eval_schema import QuestionResult


async def main(pdf_path: str, strategy: str, retriever: str, dataset_path: str):
    print(f"\n{'='*60}")
    print(f"  RAGeval CLI — {strategy} chunks / {retriever} retriever")
    print(f"{'='*60}\n")

    with open(dataset_path) as f:
        dataset = json.load(f)

    print(f"Loaded {len(dataset)} questions from {dataset_path}")
    print(f"Building pipeline...")

    pipeline = build_pipeline(
        pdf_path=pdf_path,
        pipeline_name=f"{strategy}-{retriever}",
        chunk_strategy=ChunkStrategy(strategy),
        retriever_mode=retriever,
    )

    results = []
    for i, item in enumerate(dataset):
        q = item["question"]
        gt = item["ground_truth"]
        print(f"\n[{i+1}/{len(dataset)}] {q[:60]}...")

        output = pipeline({"query": q})
        answer = output["result"]
        contexts = [d.page_content for d in output["source_documents"]]

        scores, latency = await evaluate_single(q, answer, contexts, gt)
        results.append(QuestionResult(question=q, answer=answer, ground_truth=gt, scores=scores, latency_ms=latency))

        print(f"  faithfulness={scores.faithfulness:.3f}  relevancy={scores.answer_relevancy:.3f}  overall={scores.overall:.3f}  ({latency:.0f}ms)")

    agg = aggregate_scores(results)
    print(f"\n{'='*60}")
    print(f"  AGGREGATE SCORES")
    print(f"{'='*60}")
    print(f"  Faithfulness:       {agg.faithfulness:.4f}")
    print(f"  Answer Relevancy:   {agg.answer_relevancy:.4f}")
    print(f"  Context Precision:  {agg.context_precision:.4f}")
    print(f"  Context Recall:     {agg.context_recall:.4f}")
    print(f"  Answer Correctness: {agg.answer_correctness:.4f}")
    print(f"  ─────────────────────────────")
    print(f"  Overall:            {agg.overall:.4f}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAGeval CLI runner")
    parser.add_argument("--pdf",       required=True,  help="Path to PDF document")
    parser.add_argument("--strategy",  default="recursive", choices=["fixed", "recursive", "semantic"])
    parser.add_argument("--retriever", default="rerank",    choices=["vector", "rerank", "hybrid"])
    parser.add_argument("--dataset",   default="eval/test_dataset.json")
    args = parser.parse_args()

    asyncio.run(main(args.pdf, args.strategy, args.retriever, args.dataset))