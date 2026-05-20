"""
processing/pipeline.py
───────────────────────
Orchestrates the full video processing pipeline.

Sequence:
  1. Open video with OpenCV.
  2. For each frame → YOLO detects vehicles.
  3. Tracker assigns IDs / maintains trails.
  4. Congestion engine analyses density.
  5. Alert engine evaluates rules.
  6. Analytics engine records the frame.
  7. Processed frame written to output video.
  8. Session state updated with progress.
"""

import cv2
import time
import threading
from pathlib import Path
from typing import Dict, Optional, Callable

from detector import VehicleDetector
from tracker import VehicleTracker
from congestion_engine import CongestionEngine
from alerts_engine import AlertsEngine
from analytics_engine import AnalyticsEngine
from config.settings import FRAME_SKIP, SNAPSHOTS_DIR, OUTPUTS_DIR
from utils import get_logger, safe_filename, timestamp_now

logger = get_logger("pipeline")


class ProcessingSession:
    """Holds mutable state for one processing run."""

    def __init__(self, session_id: str, filename: str, video_path: Path):
        self.session_id    = session_id
        self.filename      = filename
        self.video_path    = video_path
        self.status        = "queued"   # queued | processing | done | error
        self.progress      = 0.0
        self.error_msg: Optional[str] = None
        self.result: Optional[Dict]   = None
        self.started_at    = timestamp_now()
        self.completed_at: Optional[str] = None
        self._thread: Optional[threading.Thread] = None

    def to_dict(self) -> Dict:
        return {
            "session_id":   self.session_id,
            "filename":     self.filename,
            "status":       self.status,
            "progress":     self.progress,
            "error":        self.error_msg,
            "started_at":   self.started_at,
            "completed_at": self.completed_at,
            "result":       self.result,
        }


class ProcessingPipeline:
    """
    Manages processing sessions and coordinates all AI sub-engines.

    Usage:
        pipeline = ProcessingPipeline()
        session  = pipeline.start_session(session_id, filename, video_path)
        status   = pipeline.get_session(session_id)
    """

    def __init__(self):
        self._sessions: Dict[str, ProcessingSession] = {}
        self._detector = VehicleDetector()

    # ── Public API ─────────────────────────────────────────────────────────
    def start_session(
        self,
        session_id: str,
        filename: str,
        video_path: Path,
    ) -> ProcessingSession:
        session = ProcessingSession(session_id, filename, video_path)
        self._sessions[session_id] = session
        t = threading.Thread(
            target=self._run,
            args=(session,),
            daemon=True,
        )
        session._thread = t
        t.start()
        logger.info(f"[{session_id}] Processing thread started for '{filename}'.")
        return session

    def get_session(self, session_id: str) -> Optional[ProcessingSession]:
        return self._sessions.get(session_id)

    def list_sessions(self) -> list:
        return [s.to_dict() for s in self._sessions.values()]

    def get_all_alerts(self) -> list:
        """Collect alerts across all sessions."""
        alerts = []
        for sid, sess in self._sessions.items():
            if sess.result and "alerts" in sess.result:
                alerts.extend(sess.result["alerts"])
        return alerts

    # ── Internal pipeline ──────────────────────────────────────────────────
    def _run(self, session: ProcessingSession):
        session.status = "processing"
        try:
            result = self._process(session)
            session.result       = result
            session.status       = "done"
            session.progress     = 1.0
            session.completed_at = timestamp_now()
            logger.info(f"[{session.session_id}] Pipeline complete.")
        except Exception as exc:
            session.status    = "error"
            session.error_msg = str(exc)
            logger.error(f"[{session.session_id}] Pipeline error: {exc}", exc_info=True)

    def _process(self, session: ProcessingSession) -> Dict:
        cap = cv2.VideoCapture(str(session.video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {session.video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS) or 25
        width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_area   = width * height

        # Output video writer
        out_name = safe_filename(f"processed_{Path(session.filename).stem}.mp4")
        out_path = OUTPUTS_DIR / out_name
        fourcc   = cv2.VideoWriter_fourcc(*"mp4v")
        writer   = cv2.VideoWriter(str(out_path), fourcc, fps, (width, height))

        # Sub-engines
        tracker    = VehicleTracker()
        congestion = CongestionEngine()
        alerts_eng = AlertsEngine(session.session_id)
        analytics  = AnalyticsEngine(session.session_id)

        frame_idx    = 0
        processed    = 0
        snap_count   = 0
        start_time   = time.time()
        all_alerts   = []
        snapshot_paths = []

        self._detector._load_model()

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            if frame_idx % FRAME_SKIP != 0:
                writer.write(frame)
                continue

            processed += 1
            elapsed = time.time() - start_time

            # ── Detection ──────────────────────────────────────────────────
            detections = self._detector._detect_frame(frame)

            # ── Tracking ───────────────────────────────────────────────────
            tracks = tracker.update(detections)
            stationary = tracker.get_stationary_vehicles()

            # ── Congestion ─────────────────────────────────────────────────
            cong_report = congestion.analyse(tracks, frame_area)

            # ── Alerts ─────────────────────────────────────────────────────
            new_alerts = alerts_eng.evaluate(cong_report, stationary)
            if new_alerts:
                all_alerts.extend(new_alerts)
                analytics.record_alert()

            # ── Analytics ──────────────────────────────────────────────────
            analytics.record_frame(frame_idx, detections, cong_report, tracks, elapsed)

            # ── Annotate + write frame ──────────────────────────────────────
            annotated = self._annotate(frame.copy(), detections, tracks, cong_report, frame_idx)
            writer.write(annotated)

            # Snapshots every 60 processed frames
            if snap_count < 20 and processed % 60 == 0:
                snap_name = f"{session.session_id}_f{frame_idx}.jpg"
                snap_file = SNAPSHOTS_DIR / snap_name
                cv2.imwrite(str(snap_file), annotated)
                snapshot_paths.append(str(snap_file))
                snap_count += 1

            # Update progress
            if total_frames > 0:
                session.progress = round(frame_idx / total_frames, 3)

        cap.release()
        writer.release()

        summary = analytics.summary()
        trend   = congestion.trend_summary()

        return {
            "output_filename":    out_name,
            "output_path":        str(out_path),
            "total_frames":       total_frames,
            "processed_frames":   processed,
            "fps":                fps,
            "resolution":         f"{width}x{height}",
            "snapshot_paths":     snapshot_paths,
            "alerts":             all_alerts,
            "analytics_summary":  summary,
            "congestion_trend":   trend,
            "completed_at":       timestamp_now(),
        }

    # ── Frame annotation ──────────────────────────────────────────────────
    @staticmethod
    def _annotate(frame, detections, tracks, cong_report, frame_idx) -> any:
        """Draw detections, tracking trails, and HUD onto frame."""
        import numpy as np

        COLOURS = {
            "car": (0, 200, 255), "motorcycle": (0, 255, 100),
            "bus": (255, 100, 0), "truck": (180, 0, 255),
        }
        STATE_COLOURS = {
            "smooth": (0, 200, 100), "moderate": (0, 200, 255),
            "heavy": (0, 140, 255), "critical": (0, 0, 255),
        }

        # Draw bounding boxes
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            col = COLOURS.get(det["class_name"], (200, 200, 200))
            cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
            tag = f"{det['class_name']} {det['confidence']:.0%}"
            cv2.putText(frame, tag, (x1+2, y1-5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, col, 1, cv2.LINE_AA)

        # Draw tracking trails
        for t in tracks:
            trail = t.get("trail", [])
            for i in range(1, len(trail)):
                pt1 = tuple(trail[i-1]); pt2 = tuple(trail[i])
                cv2.line(frame, pt1, pt2, (255, 255, 100), 1)
            if trail:
                cx, cy = trail[-1]
                cv2.putText(frame, f"#{t['track_id']}", (cx+4, cy-4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255,255,100), 1)

        # HUD
        state = cong_report.get("state", "smooth")
        score = cong_report.get("congestion_score", 0)
        count = cong_report.get("vehicle_count", 0)
        hcol  = STATE_COLOURS.get(state, (200,200,200))

        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (300, 70), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.45, frame, 0.55, 0, frame)
        cv2.putText(frame, f"TRAFFIC AI  Frame {frame_idx}",
                    (8, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0,220,255), 1)
        cv2.putText(frame, f"Vehicles: {count}  |  {state.upper()}",
                    (8, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.48, hcol, 1)
        cv2.putText(frame, f"Congestion Score: {score:.2f}",
                    (8, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255,255,255), 1)

        return frame


# Module-level singleton
_pipeline: Optional[ProcessingPipeline] = None


def get_pipeline() -> ProcessingPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = ProcessingPipeline()
    return _pipeline
