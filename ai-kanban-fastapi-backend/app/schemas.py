# app/schemas.py
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv
load_dotenv()  # <-- ensure .env is loaded before reading env vars


class AIRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=8000)

class AutotagResponse(BaseModel):
    tags: List[str]

class DescribeResponse(BaseModel):
    improved: str
