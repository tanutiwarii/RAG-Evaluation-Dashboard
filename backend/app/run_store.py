from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RUNS_FILE = DATA_DIR / "runs.jsonl"


def _ensure_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not RUNS_FILE.exists():
        RUNS_FILE.touch()


def append_run(record: dict[str, Any]) -> None:
    _ensure_file()
    line = json.dumps(record, default=str) + "\n"
    with RUNS_FILE.open("a", encoding="utf-8") as f:
        f.write(line)
    try:
        os.sync()
    except AttributeError:
        pass


def list_runs(limit: int = 50) -> list[dict[str, Any]]:
    _ensure_file()
    rows: list[dict[str, Any]] = []
    with RUNS_FILE.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    rows.reverse()
    return rows[:limit]


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
