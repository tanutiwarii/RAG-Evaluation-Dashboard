from typing import List, Optional, Union
from pydantic import BaseModel


class ContextItem(BaseModel):
    content: str
    chunk_id: Optional[int] = None
    strategy: Optional[str] = "manual"
    rank: Optional[int] = None
    score: Optional[float] = 0


class SingleEvaluationRequest(BaseModel):
    question: str
    answer: str
    ground_truth: Optional[str] = ""
    contexts: List[Union[str, ContextItem]]


class BatchEvaluationRequest(BaseModel):
    mode: Optional[str] = "manual"
    items: List[dict]