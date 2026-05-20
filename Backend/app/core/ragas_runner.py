from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    answer_correctness
)
async def run_ragas(question, answer, contexts, ground_truth):
    
    dataset = Dataset.from_dict({
        "question": [question],
        "answer": [answer],
        "contexts": [contexts],
        "ground_truth": [ground_truth]
    })

    result = evaluate(dataset, metrics=[
        faithfulness, answer_relevancy,
        context_precision, context_recall,
        answer_correctness
    ])
    return result.to_pandas().to_dict()