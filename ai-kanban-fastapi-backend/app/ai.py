# app/ai.py
from dotenv import load_dotenv
load_dotenv()

import os, json, re, requests
from typing import List, Callable

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env.")

# ---------- helpers ----------
STOP = {
    "a","an","the","for","and","or","of","to","in","on","with","by","from",
    "is","are","be","been","being","do","does","did","done","will","would",
    "should","could","can","implement","add","make","create","build","setup",
    "use","using","via","about","into","over","under","at","as"
}

def _norm_tag(t: str) -> str:
    t = t.lower()
    t = re.sub(r"[^\w\s-]", "", t)
    t = re.sub(r"\s+", "-", t.strip())
    t = re.sub(r"-{2,}", "-", t)
    return t[:32]

def _safe_json_list(text: str) -> List[str]:
    # Try to extract a JSON array if present
    m = re.search(r"\[.*?\]", text, flags=re.S)
    if m:
        try:
            data = json.loads(m.group(0))
            if isinstance(data, list):
                return [str(x).strip() for x in data if isinstance(x, (str, int, float))]
        except Exception:
            pass
    # Fallback: split on lines/commas/bullets
    parts = re.split(r"[\n,]", text)
    return [p.strip().strip("-•*\"'[]") for p in parts if p.strip()]

def _heuristic_tags(title: str, description: str) -> List[str]:
    text = f"{title} {description}".lower()
    words = [w for w in re.findall(r"[a-z0-9]+", text) if len(w) > 2 and w not in STOP]
    picks, seen = [], set()
    for w in words:
        w = _norm_tag(w)
        if w and w not in seen:
            seen.add(w); picks.append(w)
        if len(picks) >= 5: break
    for h in ("backend","api","fastapi","openai","endpoints","server","uvicorn"):
        if h in text and h not in seen:
            picks.append(h); seen.add(h)
    return picks[:6]

def _groq_chat(messages: list[dict], max_tokens: int = 256, temperature: float = 0.3, timeout_s: int = 45) -> str:
    resp = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=timeout_s,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()

# --- One shared runner for symmetric behavior (LLM -> parse -> fallback) ---
def _run_with_fallback(
    system_prompt: str,
    user_prompt: str,
    parser: Callable[[str], object],
    fallback: Callable[[], object],
    *,
    max_tokens: int = 120,
    temperature: float = 0.2,
) -> object:
    try:
        text = _groq_chat(
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": user_prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout_s=45,
        )
        return parser(text)
    except Exception:
        return fallback()

# ---------- public functions used by FastAPI routes ----------
def ai_autotag(title: str, description: str) -> List[str]:
    """Symmetric to ai_describe: one LLM call, parse, normalize, fallback."""
    system = (
        "You generate concise, relevant project/task tags.\n"
        "Rules:\n"
        "- Return ONLY a JSON array of 3-6 tags (strings).\n"
        "- lowercase, kebab-case; no spaces or punctuation.\n"
        "- Prefer domain/noun tags (frameworks, features, components, areas).\n"
        "- EXCLUDE verbs (e.g., implement, add, create), prepositions, and stopwords."
    )
    fewshot_user = (
        "Title: Add login\n"
        "Description: Implement Google OAuth and session storage in frontend\n"
        "Return tags."
    )
    fewshot_assistant = '["auth","oauth","google","frontend","session"]'
    user = (
        f"{fewshot_user}\n\n"
        f"(Above is an example; now do the same for the following.)\n\n"
        f"Title: {title}\n"
        f"Description: {description}\n"
        "Return tags now."
    )

    def _parse_autotag(llm_text: str) -> List[str]:
        # Parse potential JSON list and normalize/dedupe
        raw = _safe_json_list(llm_text)
        seen, cleaned = set(), []
        for t in raw:
            nt = _norm_tag(t)
            if not nt or nt in seen or nt in STOP:
                continue
            cleaned.append(nt); seen.add(nt)

        # Helpful domain hints
        txt = f"{title} {description}".lower()
        for h in ("fastapi","openai","api","backend","uvicorn"):
            if h in txt and h not in seen:
                cleaned.append(h); seen.add(h)

        # Ensure we have at least a few tags
        if len(cleaned) < 3:
            for w in re.findall(r"[a-z0-9]+", txt):
                w = _norm_tag(w)
                if w and w not in seen and w not in STOP and len(w) > 2:
                    cleaned.append(w); seen.add(w)
                if len(cleaned) >= 5:
                    break

        return cleaned[:6]

    return _run_with_fallback(
        system_prompt=system,
        user_prompt=user,
        parser=_parse_autotag,
        fallback=lambda: _heuristic_tags(title, description),
        max_tokens=120,
        temperature=0.2,
    )  # type: ignore[return-value]

def _trim_words(text: str, max_words: int = 60) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    return (" ".join(words[:max_words]) + "…").strip()

def ai_describe(title: str, description: str) -> str:
    """Symmetric to ai_autotag: one LLM call, parse/trim, fallback."""
    system = (
        "You improve task descriptions. "
        "Return ONE concise paragraph of 30-60 words. "
        "Focus on the objective, a brief approach, and the key outcome. "
        "Avoid headers, lists, bullets, and filler. "
        "No acceptance criteria. No second paragraph."
    )
    user = (
        f"Title: {title}\n\n"
        f"Current description:\n{description}\n\n"
        "Rewrite as one tight paragraph (30-60 words), maximizing clarity and minimizing fluff."
    )

    def _parse_desc(llm_text: str) -> str:
        return _trim_words(llm_text, 60)

    def _fallback_desc() -> str:
        base = f"{title}: {description}".strip()
        return _trim_words(base, 60)

    return _run_with_fallback(
        system_prompt=system,
        user_prompt=user,
        parser=_parse_desc,
        fallback=_fallback_desc,
        max_tokens=120,
        temperature=0.2,
    )  # type: ignore[return-value]
