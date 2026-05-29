import re

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str):
    stopwords = {
        "the", "is", "are", "a", "an", "and", "or", "to", "of", "in",
        "on", "for", "with", "as", "by", "it", "this", "that", "from",
        "be", "can", "has", "have", "was", "were", "will", "which",
        "what", "why", "how", "when", "where", "who"
    }

    words = clean_text(text).split()

    return [
        word
        for word in words
        if word not in stopwords and len(word) > 2
    ]


def get_context_text(contexts: list):
    return " ".join(
        [
            context["content"]
            if isinstance(context, dict)
            else context
            for context in contexts
        ]
    )


def calculate_faithfulness(answer: str, contexts: list):
    answer_tokens = set(tokenize(answer))
    context_tokens = set(tokenize(get_context_text(contexts)))

    if not answer_tokens:
        return 0.0

    overlap = answer_tokens.intersection(context_tokens)

    return len(overlap) / len(answer_tokens)


def calculate_answer_relevancy(question: str, answer: str):
    question_tokens = set(tokenize(question))
    answer_tokens = set(tokenize(answer))

    if not question_tokens:
        return 0.0

    overlap = question_tokens.intersection(answer_tokens)

    score = len(overlap) / len(question_tokens)

    length_factor = min(
        len(answer_tokens) / 20,
        1.0
    )

    score = (
        score * 0.7 +
        length_factor * 0.3
    )

    return min(score, 1.0)


def calculate_context_precision(question: str, answer: str, contexts: list):
    if not contexts:
        return 0.0

    question_tokens = set(tokenize(question))
    answer_tokens = set(tokenize(answer))

    if not question_tokens or not answer_tokens:
        return 0.0

    useful_contexts = 0

    for context in contexts:
        context_text = (
            context["content"]
            if isinstance(context, dict)
            else context
        )

        context_tokens = set(tokenize(context_text))

        question_overlap = len(
            question_tokens.intersection(context_tokens)
        ) / max(len(question_tokens), 1)

        answer_overlap = len(
            answer_tokens.intersection(context_tokens)
        ) / max(len(answer_tokens), 1)

        relevance_score = (
            question_overlap * 0.4 +
            answer_overlap * 0.6
        )

        if relevance_score >= 0.45:
            useful_contexts += 1

    return useful_contexts / len(contexts)

def calculate_context_recall(answer: str, contexts: list):
    answer_tokens = set(tokenize(answer))

    if not answer_tokens:
        return 0.0

    context_tokens = set(
        tokenize(
            get_context_text(contexts)
        )
    )

    if not context_tokens:
        return 0.0

    covered_answer_tokens = answer_tokens.intersection(
        context_tokens
    )

    coverage = len(covered_answer_tokens) / len(answer_tokens)

    context_noise_penalty = min(
        len(answer_tokens) / max(len(context_tokens), 1),
        1.0
    )

    recall = (
        coverage * 0.75 +
        context_noise_penalty * 0.25
    )

    return min(recall, 1.0)

def calculate_answer_correctness(
    question: str,
    answer: str,
    contexts: list,
    ground_truth: str = ""
):
    if ground_truth and ground_truth.strip():

        answer_tokens = set(tokenize(answer))
        truth_tokens = set(tokenize(ground_truth))

        if not truth_tokens:
            return 0.0

        overlap = answer_tokens.intersection(truth_tokens)

        precision = (
            len(overlap) /
            max(len(answer_tokens), 1)
        )

        recall = (
            len(overlap) /
            max(len(truth_tokens), 1)
        )

        if precision + recall == 0:
            return 0.0

        f1_score = (
            2 * precision * recall /
            (precision + recall)
        )

        return min(f1_score, 1.0)

    faithfulness = calculate_faithfulness(
        answer,
        contexts
    )

    relevancy = calculate_answer_relevancy(
        question,
        answer
    )

    return (
        faithfulness * 0.6 +
        relevancy * 0.4
    )


async def evaluate_rag(
    question,
    answer,
    contexts,
    ground_truth=""
):
    faithfulness = calculate_faithfulness(
        answer,
        contexts
    )

    answer_relevancy = calculate_answer_relevancy(
        question,
        answer
    )

    context_precision = calculate_context_precision(
        question,
        answer,
        contexts
    )

    context_recall = calculate_context_recall(
        answer,
        contexts
    )

    answer_correctness = calculate_answer_correctness(
        question,
        answer,
        contexts,
        ground_truth
    )

    return {
        "faithfulness": round(faithfulness, 2),
        "answer_relevancy": round(answer_relevancy, 2),
        "context_precision": round(context_precision, 2),
        "context_recall": round(context_recall, 2),
        "answer_correctness": round(answer_correctness, 2),
        "latency": 0
    }