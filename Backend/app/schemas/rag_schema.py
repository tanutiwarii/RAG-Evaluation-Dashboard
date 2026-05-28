from pydantic import BaseModel
from typing import List


class AskRequest(BaseModel):
    question: str


class MetricsResponse(BaseModel):
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    context_recall: float
    answer_correctness: float
    latency: float

class AskResponse(BaseModel):
    question: str
    answer: str
    contexts: List[str]
    metrics: MetricsResponse