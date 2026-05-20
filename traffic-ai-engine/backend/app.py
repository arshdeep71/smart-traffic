"""
app.py
──────
Main FastAPI server for the Traffic AI Engine.

Run with:
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload

Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""

import sys
import os

# Ensure project root is on the path so all relative imports work
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from config.settings import (
    API_HOST, API_PORT,
    OUTPUTS_DIR, SNAPSHOTS_DIR,
)
from utils import get_logger, timestamp_now

logger = get_logger("app")

# ── App factory ────────────────────────────────────────────────────────────
app = FastAPI(
    title="🚦 Traffic AI Engine",
    description=(
        "AI-powered smart-city traffic surveillance backend.\n\n"
        "Processes CCTV traffic videos using **YOLOv8** vehicle detection, "
        "multi-object tracking, congestion analysis, and AI-assisted incident alerts.\n\n"
        "**Key endpoints:**\n"
        "- `POST /upload-video` — upload an MP4 traffic video\n"
        "- `POST /start-processing` — launch AI detection pipeline\n"
        "- `GET  /processing-status/{id}` — poll progress\n"
        "- `GET  /live-analytics` — real-time traffic analytics\n"
        "- `GET  /alerts` — generated AI alerts\n"
        "- `GET  /camera-feeds` — simulated CCTV feed states\n"
        "- `POST /simulate/incident` — trigger demo incident\n"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # open for local dev / demo
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file mounts ─────────────────────────────────────────────────────
app.mount("/outputs",   StaticFiles(directory=str(OUTPUTS_DIR)),   name="outputs")
app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(router)


# ── Startup / shutdown events ──────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info("=" * 60)
    logger.info("  🚦 Traffic AI Engine  v1.0.0  —  Starting up")
    logger.info(f"  Swagger UI → http://{API_HOST}:{API_PORT}/docs")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Traffic AI Engine shutting down.")


# ── Dev runner ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
        log_level="info",
    )
