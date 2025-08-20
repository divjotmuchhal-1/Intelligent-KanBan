#!/usr/bin/env bash
set -euo pipefail
export $(grep -v '^#' .env | xargs -0 -I {} echo {} 2>/dev/null || true)
uvicorn app.main:app --host 0.0.0.0 --port 8000
