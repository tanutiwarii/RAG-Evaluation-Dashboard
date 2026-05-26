from openai import OpenAI

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