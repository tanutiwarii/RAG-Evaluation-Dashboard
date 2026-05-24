from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENAI_API_KEY: str
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "rag-eval-dashboard"
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/rageval"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"

    class Config:
        env_file = ".env"


settings = Settings()