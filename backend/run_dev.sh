#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "Creating .venv in $ROOT"
  python3 -m venv .venv
fi

echo "Installing dependencies into .venv …"
./.venv/bin/pip install -q -r requirements.txt

echo "Starting API at http://127.0.0.1:8000 (use this terminal’s Python, not global pyenv)"
exec ./.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
