import json
import os
from datetime import datetime


history_FILE = (
    "app/data/evaluation_history.json"
)


def load_history():

    if not os.path.exists(history_FILE):
        return []

    with open(history_FILE, "r") as file:
        return json.load(file)


def save_run(run_data):

    history = load_history()

    history.insert(0, run_data)

    with open(history_FILE, "w") as file:
        json.dump(history, file, indent=2)


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
        "ground_truth":ground_truth,
        "winner": winner,
        "strategies": {
            "fixed": fixed,
            "recursive": recursive,
            "semantic": semantic
        }
    }