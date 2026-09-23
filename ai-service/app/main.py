"""UGCNP AI Service — lightweight FastAPI app.

Runs standalone (uvicorn) or inside Docker. Exposes the endpoints the
backend's AiClient calls:
  GET  /health
  POST /analyze-content
  POST /generate-copy
  POST /match
  POST /predict

All endpoints are deterministic, dependency-free `numpy`-free heuristics so
the platform works offline; swap the internals with real model calls later.
"""

import time

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from . import engine

app = FastAPI(
    title="UGCNP AI Service",
    version="0.1.0",
    description="Creator-brand matching, content analysis, copy generation and prediction.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STARTED = time.time()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ugcnp-ai", "uptimeSeconds": int(time.time() - _STARTED)}


@app.post("/analyze-content")
def analyze_content(payload: dict) -> dict:
    """Score a submission (fileUrl + caption) for quality and brand fit."""
    return engine.analyze_content(payload)


@app.post("/generate-copy")
def generate_copy(payload: dict) -> dict:
    """Generate caption/hook/hashtag suggestions from brand/campaign context."""
    return engine.generate_copy(payload)


@app.post("/match")
def match(payload: dict) -> list[dict]:
    """Score creators against a campaign brief."""
    return engine.match_creators(payload)


@app.post("/predict")
def predict(payload: dict) -> dict:
    """Predict campaign or engagement outcomes."""
    return engine.predict(payload)