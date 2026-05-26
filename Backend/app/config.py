from pydantic import Field
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_API_URL: str = "https://api.groq.ai/v1/responses"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "rag-eval-dashboard"
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/rageval"
    CHROMA_PERSIST_DIR: str = Field("./chroma_db", env=["CHROMA_PERSIST_DIR", "CHROMADB_PERSIST_DIR"])
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"

    class Config:
        env_file = ".env"


settings = Settings()