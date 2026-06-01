from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.evaluate_routes import router as evaluate_router
from app.routes.rag_routes import (
    router as rag_router
)
from app.routes.upload_routes import (
    router as upload_router
)
from app.routes.chunking_routes import (
    router as chunking_router
)
from app.core.exceptions import (
    generic_exception_handler
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
app.include_router(chunking_router)
app.include_router(evaluate_router)
app.add_exception_handler(
    Exception,
    generic_exception_handler
)