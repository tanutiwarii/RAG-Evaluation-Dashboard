import os

rag_pipeline = None


def get_rag_pipeline():
    global rag_pipeline

    if os.getenv("DEPLOY_MODE") == "light":
        return None

    from app.rag.pipeline import RAGPipeline

    if rag_pipeline is None:
        rag_pipeline = RAGPipeline()

    return rag_pipeline
