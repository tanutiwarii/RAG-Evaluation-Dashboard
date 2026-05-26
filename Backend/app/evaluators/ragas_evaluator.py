class RAGASEvaluator:

    async def evaluate_response(
        self,
        question: str,
        answer: str,
        contexts: list[str],
        latency: float
    ):

        context_text = " ".join(contexts).lower()

        answer_words = answer.lower().split()

        matched_words = [
            word
            for word in answer_words
            if word in context_text
        ]

        faithfulness_score = (
            len(matched_words) / max(len(answer_words), 1)
        )

        relevance_score = (
            min(len(answer_words) / 20, 1.0)
        )

        context_utilization = (
            min(len(contexts) / 5, 1.0)
        )

        return {
            "faithfulness": round(faithfulness_score, 2),
            "answer_relevancy": round(relevance_score, 2),
            "context_utilization": round(context_utilization, 2),
            "latency": latency
        }