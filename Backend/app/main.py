from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.rag_routes import (
    router as rag_router
)
from app.routes.upload_routes import (
    router as upload_router
)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag_router)
app.include_router(upload_router)