"""
api/routes.py
─────────────
All FastAPI route definitions for the Traffic AI Engine.

Endpoints:
  GET  /health
  POST /upload-video
  POST /start-processing
  GET  /processing-status/{session_id}
  GET  /live-analytics
  GET  /alerts
  GET  /processed-videos
  GET  /camera-feeds

  POST /simulate/tick          — demo: get one simulation tick
  POST /simulate/spike         — demo: trigger congestion spike
  POST /simulate/incident      — demo: trigger incident scenario
"""

import os
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse

from config.settings import (
    UPLOADS_DIR, OUTPUTS_DIR, SNAPSHOTS_DIR,
    ALLOWED_VIDEO_EXTENSIONS, MAX_UPLOAD_MB,
)
from processing.pipeline import get_pipeline
from simulation_engine import get_simulation
from utils import new_session_id, safe_filename, timestamp_now, get_logger

logger = get_logger("api.routes")
router = APIRouter()


# ── /health ────────────────────────────────────────────────────────────────
@router.get("/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "service": "Traffic AI Engine",
        "version": "1.0.0",
        "timestamp": timestamp_now(),
    }


# ── /upload-video ──────────────────────────────────────────────────────────
@router.post("/upload-video", tags=["Video"])
async def upload_video(file: UploadFile = File(...)):
    """
    Accept an MP4 traffic video and store it for processing.
    Returns a session_id to track this upload through the pipeline.
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. "
                   f"Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}",
        )

    session_id   = new_session_id()
    safe_name    = safe_filename(file.filename)
    dest         = UPLOADS_DIR / safe_name

    try:
        with open(dest, "wb") as out:
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                out.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    file_size_mb = round(dest.stat().st_size / 1_048_576, 2)
    if file_size_mb > MAX_UPLOAD_MB:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB} MB limit.")

    logger.info(f"[{session_id}] Uploaded '{safe_name}' ({file_size_mb} MB)")

    return {
        "session_id":   session_id,
        "filename":     safe_name,
        "original_name": file.filename,
        "size_mb":      file_size_mb,
        "upload_path":  str(dest),
        "status":       "uploaded",
        "uploaded_at":  timestamp_now(),
    }


# ── /start-processing ──────────────────────────────────────────────────────
@router.post("/start-processing", tags=["Video"])
def start_processing(session_id: str, filename: str):
    """
    Start the AI detection pipeline for a previously uploaded video.

    Query params:
      session_id — from /upload-video response
      filename   — from /upload-video response
    """
    video_path = UPLOADS_DIR / filename
    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Video '{filename}' not found in uploads.",
        )

    pipeline = get_pipeline()
    session  = pipeline.start_session(session_id, filename, video_path)
    return {
        "session_id": session_id,
        "filename":   filename,
        "status":     session.status,
        "message":    "AI processing pipeline started.",
        "started_at": session.started_at,
    }


# ── /processing-status/{session_id} ───────────────────────────────────────
@router.get("/processing-status/{session_id}", tags=["Video"])
def processing_status(session_id: str):
    """Poll the progress of an active or completed processing session."""
    pipeline = get_pipeline()
    session  = pipeline.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return session.to_dict()


# ── /live-analytics ────────────────────────────────────────────────────────
@router.get("/live-analytics", tags=["Analytics"])
def live_analytics(
    use_simulation: bool = Query(False, description="Return simulated data if True"),
    scenario: str       = Query("busy", description="Scenario: normal|busy|congested|critical|incident"),
):
    """
    Return live traffic analytics.

    If use_simulation=true, returns synthetic data (useful for demos without a video).
    Otherwise, aggregates from all active processing sessions.
    """
    if use_simulation:
        sim  = get_simulation()
        data = sim.tick(scenario)
        return {"source": "simulation", "data": data}

    pipeline  = get_pipeline()
    sessions  = pipeline.list_sessions()
    done      = [s for s in sessions if s["status"] == "done"]

    if not done:
        # No real sessions — fall back to simulation
        sim  = get_simulation()
        data = sim.tick("normal")
        return {"source": "simulation_fallback", "data": data, "sessions": len(sessions)}

    latest = done[-1]
    return {
        "source":   "real_processing",
        "data":     latest.get("result", {}).get("analytics_summary", {}),
        "session":  latest["session_id"],
    }


# ── /alerts ────────────────────────────────────────────────────────────────
@router.get("/alerts", tags=["Alerts"])
def get_alerts(
    use_simulation: bool = Query(False),
    scenario: str        = Query("busy"),
    limit: int           = Query(50),
):
    """
    Return AI-generated alerts.

    use_simulation=true returns synthetic alerts for demos.
    """
    if use_simulation:
        sim  = get_simulation()
        tick = sim.tick(scenario)
        return {
            "source": "simulation",
            "count":  len(tick.get("simulated_alerts", [])),
            "alerts": tick.get("simulated_alerts", []),
        }

    pipeline = get_pipeline()
    alerts   = pipeline.get_all_alerts()
    return {
        "source": "real_processing",
        "count":  len(alerts),
        "alerts": alerts[-limit:],
    }


# ── /processed-videos ─────────────────────────────────────────────────────
@router.get("/processed-videos", tags=["Video"])
def processed_videos():
    """List all processed output videos."""
    files = sorted(OUTPUTS_DIR.glob("*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True)
    return {
        "count": len(files),
        "videos": [
            {
                "filename":    f.name,
                "size_mb":     round(f.stat().st_size / 1_048_576, 2),
                "created_at":  timestamp_now(),
                "download_url": f"/download-video/{f.name}",
            }
            for f in files
        ],
    }


@router.get("/download-video/{filename}", tags=["Video"])
def download_video(filename: str):
    """Download a processed output video."""
    path = OUTPUTS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not found.")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)


# ── /camera-feeds ─────────────────────────────────────────────────────────
@router.get("/camera-feeds", tags=["Simulation"])
def camera_feeds():
    """Return simulated smart-city camera feed states."""
    sim = get_simulation()
    return {
        "source":  "simulation",
        "count":   5,
        "cameras": sim.camera_feeds(),
    }


# ── Simulation control endpoints ──────────────────────────────────────────
@router.post("/simulate/tick", tags=["Simulation"])
def simulate_tick(scenario: str = Query("busy")):
    """Advance simulation by one tick and return analytics."""
    sim = get_simulation()
    return sim.tick(scenario)


@router.post("/simulate/spike", tags=["Simulation"])
def simulate_spike():
    """Trigger a sudden congestion spike in the simulation."""
    sim = get_simulation()
    return sim.congestion_spike()


@router.post("/simulate/incident", tags=["Simulation"])
def simulate_incident(camera_id: Optional[str] = Query(None)):
    """Trigger an incident on a specific (or random) simulated camera."""
    sim = get_simulation()
    return sim.trigger_incident(camera_id)


# ── /snapshots ────────────────────────────────────────────────────────────
@router.get("/snapshots", tags=["Video"])
def list_snapshots(session_id: Optional[str] = Query(None)):
    """List detection snapshots, optionally filtered by session."""
    pattern = f"{session_id}_*.jpg" if session_id else "*.jpg"
    files   = sorted(SNAPSHOTS_DIR.glob(pattern), key=lambda f: f.stat().st_mtime, reverse=True)
    return {
        "count":     len(files),
        "snapshots": [{"filename": f.name, "path": str(f)} for f in files[:50]],
    }

# ── /live-feed ────────────────────────────────────────────────────────────
@router.get("/live-feed", tags=["Video"])
def live_feed(camera_id: str = Query("0", description="Camera index or RTSP URL")):
    """
    Stream live camera feed with real-time YOLOv8 vehicle detection.
    Supports local webcams (0, 1) or IP cameras (RTSP URLs).
    """
    from detector import get_detector
    detector = get_detector()
    
    # Convert to int if it's a simple camera index like "0" or "1"
    cam_source = int(camera_id) if camera_id.isdigit() else camera_id
    
    return StreamingResponse(
        detector.generate_live_feed(cam_source),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
