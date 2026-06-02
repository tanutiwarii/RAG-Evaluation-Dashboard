from fastapi import APIRouter
from app.utils.history_store import (
    load_history,
    clear_history,
    delete_run
)

router = APIRouter()


@router.get("/history")
async def get_history(page: int = 1, limit: int = 5):
    return load_history(page=page, limit=limit)


@router.delete("/history")
async def clear_history_route():
    clear_history()
    return {"message": "History cleared successfully"}


@router.delete("/history/{run_id}")
async def delete_history_run(run_id: str):
    delete_run(run_id)
    return {"message": "Run deleted successfully"}