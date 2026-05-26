"""Example external pipeline service.

This stub shows the expected contract for `external_pipeline_url`.
It returns a JSON object with `result` and either `contexts` or
`source_documents`, which is what the dashboard adapter consumes.

Run with:
    uvicorn app.examples.external_pipeline_stub:app --reload --port 9000

Then point the dashboard batch eval to:
    http://localhost:9000/pipeline
"""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class PipelineRequest(BaseModel):
    question: str


class PipelineResponse(BaseModel):
    result: str
    contexts: list[str]


@app.post("/pipeline", response_model=PipelineResponse)
async def pipeline(request: PipelineRequest):
    # In a real external RAG service, you would run your retrieval + generation
    # pipeline here and return the answer plus the retrieved context chunks.
    return PipelineResponse(
        result=f"Stub answer for: {request.question}",
        contexts=[
            "Example retrieved chunk 1.",
            "Example retrieved chunk 2.",
        ],
    )
