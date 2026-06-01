from fastapi import (
    APIRouter,
    UploadFile,
    File
)

import os

from app.services.pdf_service import (
    extract_text_from_pdf
)

from app.core.rag_instance import get_rag_pipeline
router = APIRouter()

UPLOAD_DIR = "uploads"


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as f:

        content = await file.read()

        f.write(content)

    print("Extracting PDF text...")

    pdf_text = extract_text_from_pdf(
        file_path
    )

    print("Indexing PDF...")

    rag_pipeline = get_rag_pipeline()

    if rag_pipeline is None:
        return {
            "error": "Pipeline mode is disabled in free deployment. Use manual evaluation mode."
        }

    rag_pipeline.load_pdf(
        pdf_text,
        file.filename
    )

    return {

        "message":
        "PDF uploaded and indexed successfully",

        "filename": file.filename
    }
@router.get("/documents")
async def get_documents():

    rag_pipeline = get_rag_pipeline()

    if rag_pipeline is None:
        return {
            "error": "Pipeline mode is disabled in free deployment. Use manual evaluation mode."
        }

    return {
        "documents":
        rag_pipeline.get_loaded_documents()
    }


@router.delete("/documents/{source_name}")
async def delete_document(
    source_name: str
):

    rag_pipeline = get_rag_pipeline()

    if rag_pipeline is None:
        return {
            "error": "Pipeline mode is disabled in free deployment. Use manual evaluation mode."
        }

    rag_pipeline.remove_document(
        source_name
    )

    return {
        "message":
        f"{source_name} removed"
    }


@router.delete("/documents")
async def clear_documents():

    rag_pipeline = get_rag_pipeline()

    if rag_pipeline is None:
        return {
            "error": "Pipeline mode is disabled in free deployment. Use manual evaluation mode."
        }

    rag_pipeline.clear_knowledge_base()

    return {
        "message":
        "Knowledge base cleared"
    }
