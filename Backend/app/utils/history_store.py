from datetime import datetime

from app.db.supabase_client import supabase


TABLE_NAME = "evaluation_runs"


def load_history(
    page: int = 1,
    limit: int = 10
):
    start = (page - 1) * limit
    end = start + limit - 1

    data_response = (
        supabase
        .table(TABLE_NAME)
        .select("*")
        .order("created_at", desc=True)
        .range(start, end)
        .execute()
    )

    count_response = (
        supabase
        .table(TABLE_NAME)
        .select("*", count="exact")
        .execute()
    )

    total = count_response.count or 0

    return {
        "items": [
            format_run(row)
            for row in data_response.data
        ],
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (
            (total + limit - 1) // limit
            if total > 0
            else 1
        )
    }


def save_run(run_data):
    supabase.table(TABLE_NAME).insert(run_data).execute()


def delete_run(run_id: str):
    supabase.table(TABLE_NAME).delete().eq(
        "run_id",
        run_id
    ).execute()


def clear_history():
    supabase.table(TABLE_NAME).delete().neq(
        "run_id",
        ""
    ).execute()


def create_run_entry(
    question,
    chunk_size,
    chunk_overlap,
    ground_truth,
    fixed,
    recursive,
    semantic,
    winner
):
    return {
        "run_id": f"run_{datetime.now().timestamp()}",
        "timestamp": datetime.now().isoformat(),
        "question": question,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "ground_truth": ground_truth,
        "winner": winner,
        "strategies": {
            "fixed": fixed,
            "recursive": recursive,
            "semantic": semantic
        }
    }


def format_run(row):
    strategies = row.get("strategies", {})

    return {
        "run_id": row.get("run_id"),
        "timestamp": row.get("timestamp"),
        "question": row.get("question"),
        "chunk_size": row.get("chunk_size"),
        "chunk_overlap": row.get("chunk_overlap"),
        "ground_truth": row.get("ground_truth"),
        "winner": row.get("winner"),
        "strategies": strategies
    }