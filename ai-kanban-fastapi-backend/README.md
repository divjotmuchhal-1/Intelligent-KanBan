# AI Kanban – FastAPI Backend

Implements the two endpoints your frontend calls via `src/lib/edge.ts`:

- `POST /api/ai/autotag` → `{ "tags": string[] }`
- `POST /api/ai/describe` → `{ "improved": string }`

These match the calls in your React app:
```ts
// src/lib/edge.ts
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
fetch(`${API_BASE}/api/ai/autotag`, ...)
fetch(`${API_BASE}/api/ai/describe`, ...)
```

## Quick start

```bash
# 1) Create and fill .env
cp .env.example .env
# Put your OpenAI key in OPENAI_API_KEY=...

# 2) Install deps (prefer a venv)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3) Run the API
./run.sh
# -> http://localhost:8000/health
```

On the **frontend**, set:
```
VITE_API_BASE=http://localhost:8000
```
(restart Vite if running)

## Endpoints

### POST /api/ai/autotag
Input:
```json
{ "title": "Add login", "description": "OAuth with Google; update navbar" }
```
Response:
```json
{ "tags": ["auth","oauth","google","frontend","navbar"] }
```

### POST /api/ai/describe
Input:
```json
{ "title": "Refactor task card", "description": "Make it accessible and DRY" }
```
Response:
```json
{ "improved": "..." }
```

## Notes
- CORS allows `http://localhost:5173` and `http://localhost:3000` by default. Set `FRONTEND_ORIGIN` in `.env` if needed.
- Uses `gpt-4o-mini` by default for low-latency, low-cost calls. You can switch `OPENAI_MODEL` in `.env`.
- `ai.py` is defensive: if the model returns non-JSON for tags, it still extracts a clean list.
