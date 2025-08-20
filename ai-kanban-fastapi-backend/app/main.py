# app/main.py
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .schemas import AIRequest, AutotagResponse, DescribeResponse
from .ai import ai_autotag, ai_describe
import logging

load_dotenv()

app = FastAPI(title="AI Kanban Backend", version="0.1.0")

# --- CORS ---
# Dev-friendly: allow ANY localhost/127.0.0.1 port (e.g., 5173, 5174, 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=False,   # set True only if you use cookies/auth across origins
    allow_methods=["*"],
    allow_headers=["*"],
)

log = logging.getLogger("uvicorn.error")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/ai/autotag", response_model=AutotagResponse)
def api_autotag_handler(body: AIRequest, request: Request):
    try:
        tags = ai_autotag(body.title, body.description)
        return AutotagResponse(tags=tags)
    except Exception as e:
        log.exception("autotag failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/describe", response_model=DescribeResponse)
def api_describe_handler(body: AIRequest, request: Request):
    try:
        improved = ai_describe(body.title, body.description)
        return DescribeResponse(improved=improved)
    except Exception as e:
        log.exception("describe failed")
        raise HTTPException(status_code=500, detail=str(e))
