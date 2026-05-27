from fastapi import (
    APIRouter,
    UploadFile,
    File
)

import os

from app.services.pdf_service import (
    extract_text_from_pdf
)

from app.routes.rag_routes import (
    rag_pipeline
)

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

    rag_pipeline.load_pdf(
        pdf_text
    )

    return {

        "message":
        "PDF uploaded and indexed successfully",

        "filename": file.filename
    }