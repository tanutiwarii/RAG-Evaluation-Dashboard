from openai import OpenAI
from langsmith import traceable
from app.core import (
    GITHUB_TOKEN,
    GITHUB_ENDPOINT,
    GITHUB_MODEL
)

client = OpenAI(
    base_url=GITHUB_ENDPOINT,
    api_key=GITHUB_TOKEN,
)


class LLMService:

    @traceable(name="generate_rag_answer")
    async def generate_answer(self, question: str, contexts: list[str]):

        context_text = "\n\n".join(contexts)

        prompt = f"""
You are a helpful RAG assistant.

Answer ONLY using the provided context.

Context:
{context_text}

Question:
{question}
"""

        response = client.chat.completions.create(
            model=GITHUB_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You answer questions only from provided context."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return response.choices[0].message.content
    
    async def stream_answer(self, question: str, contexts: list[str]):

        context_text = "\n\n".join(contexts)

        prompt = f"""
    You are a helpful RAG assistant.

    Answer ONLY using the provided context.

    Context:
    {context_text}

    Question:
    {question}
    """

        stream = client.chat.completions.create(
            model=GITHUB_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You answer questions only from provided context."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            stream=True
        )

        for chunk in stream:

            if not chunk.choices:
                continue

            choice = chunk.choices[0]

            delta = getattr(choice, "delta", None)

            if delta is None:
                continue

            content = getattr(delta, "content", None)

            if content:
                yield content