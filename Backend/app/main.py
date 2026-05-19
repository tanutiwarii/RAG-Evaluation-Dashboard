from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.api import evaluate, health
from app.db.database import init_db

app = FastAPI(title="RAG Eval Dashboard")
limiter = Limiter(key_func=get_remote_address)

app.add_middleware(CORSMiddleware,
  allow_origins=["http://localhost:3000"],
  allow_methods=["*"], allow_headers=["*"])

app.include_router(health.router)
app.include_router(evaluate.router, prefix="/api")

@app.on_event("startup")
async def startup():
    await init_db()