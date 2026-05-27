import time


def _normalize(x):
    if isinstance(x, dict):
        return x.get("answer") or x.get("content") or ""
    return str(x)


async def evaluate_rag(question, answer, contexts):

    start_time = time.time()

    # ✅ FIX: normalize inputs
    answer = _normalize(answer)

    contexts = [_normalize(c) for c in contexts]

    faithfulness = (
        1.0
        if contexts and answer.lower() in contexts[0].lower()
        else 0.5
    )

    answer_relevancy = 0.8
    context_utilization = 0.7

    latency = round(time.time() - start_time, 2)

    return {
        "faithfulness": faithfulness,
        "answer_relevancy": answer_relevancy,
        "context_utilization": context_utilization,
        "latency": latency
    }