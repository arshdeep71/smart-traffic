"""
detector.py
───────────
YOLOv8 vehicle detection engine.

Responsibilities:
  • Load YOLOv8 model (downloads on first run).
  • Read uploaded video frame-by-frame.
  • Detect vehicles (car / motorcycle / bus / truck).
  • Draw annotated bounding boxes with class label + confidence.
  • Save processed output video to outputs/.
  • Return per-frame detection metadata.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable

from config.settings import (
    YOLO_MODEL,
    YOLO_CONF_THRESHOLD,
    YOLO_IOU_THRESHOLD,
    VEHICLE_CLASSES,
    OUTPUTS_DIR,
    SNAPSHOTS_DIR,
    FRAME_SKIP,
    MAX_SNAPSHOT_PER_SESSION,
)
from utils import get_logger, safe_filename, timestamp_now

logger = get_logger("detector")

# ── Colour palette per class ───────────────────────────────────────────────
CLASS_COLOURS: Dict[str, tuple] = {
    "car":        (0, 200, 255),   # cyan-yellow
    "motorcycle": (0, 255, 100),   # green
    "bus":        (255, 100, 0),   # orange
    "truck":      (180, 0, 255),   # purple
}
DEFAULT_COLOUR = (200, 200, 200)


class VehicleDetector:
    """
    Wraps a YOLOv8 model for frame-level vehicle detection.

    Usage:
        detector = VehicleDetector()
        result   = detector.process_video(video_path, session_id, progress_cb)
    """

    def __init__(self):
        self._model = None

    # ── Lazy model loader ──────────────────────────────────────────────────
    def _load_model(self):
        if self._model is not None:
            return
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model: {YOLO_MODEL}")
            self._model = YOLO(YOLO_MODEL)
            logger.info("YOLO model ready.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise

    # ── Public API ─────────────────────────────────────────────────────────
    def process_video(
        self,
        video_path: Path,
        session_id: str,
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> Dict[str, Any]:
        """
        Run full detection pipeline on a video file.

        Returns a result dict with:
          output_path, total_frames, processed_frames,
          detections_per_frame, snapshot_paths, summary
        """
        self._load_model()

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS) or 25
        width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        output_filename = safe_filename(f"detected_{video_path.stem}.mp4")
        output_path     = OUTPUTS_DIR / output_filename

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

        detections_per_frame: List[Dict] = []
        snapshot_paths: List[str] = []
        frame_idx      = 0
        processed      = 0
        snapshot_count = 0

        logger.info(
            f"[{session_id}] Starting detection | "
            f"frames={total_frames} fps={fps:.1f} res={width}x{height}"
        )

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1

            # Skip frames for speed
            if frame_idx % FRAME_SKIP != 0:
                writer.write(frame)
                continue

            processed += 1
            detections = self._detect_frame(frame)
            annotated  = self._annotate_frame(frame.copy(), detections, frame_idx)
            writer.write(annotated)

            detections_per_frame.append({
                "frame": frame_idx,
                "count": len(detections),
                "objects": detections,
            })

            # Save snapshots periodically
            if snapshot_count < MAX_SNAPSHOT_PER_SESSION and processed % 50 == 0:
                snap_name = f"{session_id}_frame{frame_idx}.jpg"
                snap_path = SNAPSHOTS_DIR / snap_name
                cv2.imwrite(str(snap_path), annotated)
                snapshot_paths.append(str(snap_path))
                snapshot_count += 1

            # Progress callback
            if progress_callback and total_frames > 0:
                progress_callback(round(frame_idx / total_frames, 3))

        cap.release()
        writer.release()

        summary = self._build_summary(detections_per_frame)
        logger.info(
            f"[{session_id}] Detection complete | "
            f"processed={processed} output={output_filename}"
        )

        return {
            "output_path":          str(output_path),
            "output_filename":      output_filename,
            "total_frames":         total_frames,
            "processed_frames":     processed,
            "fps":                  fps,
            "resolution":           f"{width}x{height}",
            "detections_per_frame": detections_per_frame,
            "snapshot_paths":       snapshot_paths,
            "summary":              summary,
            "completed_at":         timestamp_now(),
        }

    def generate_live_feed(self, camera_index=0):
        """Yields MJPEG frames from the local webcam with live YOLO detections."""
        self._load_model()
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            logger.error(f"Cannot open webcam index {camera_index}")
            return
            
        frame_idx = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                frame_idx += 1
                
                # Detect on every frame for live feed (or skip if too slow, but webcams are usually 30fps)
                detections = self._detect_frame(frame)
                annotated = self._annotate_frame(frame.copy(), detections, frame_idx)
                
                # Encode as JPEG
                ret, buffer = cv2.imencode('.jpg', annotated)
                if not ret:
                    continue
                    
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        finally:
            logger.info(f"Releasing camera {camera_index} connection.")
            cap.release()

    # ── Internal helpers ───────────────────────────────────────────────────
    def _detect_frame(self, frame: np.ndarray) -> List[Dict]:
        """Run YOLO inference on a single frame, return vehicle detections only."""
        results = self._model.predict(
            frame,
            conf=YOLO_CONF_THRESHOLD,
            iou=YOLO_IOU_THRESHOLD,
            verbose=False,
        )[0]

        detections = []
        for box in results.boxes:
            cls_id = int(box.cls[0])
            if cls_id not in VEHICLE_CLASSES:
                continue
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            detections.append({
                "class_id":    cls_id,
                "class_name":  VEHICLE_CLASSES[cls_id],
                "confidence":  round(float(box.conf[0]), 3),
                "bbox":        [x1, y1, x2, y2],
                "center":      [(x1 + x2) // 2, (y1 + y2) // 2],
            })
        return detections

    def _annotate_frame(
        self, frame: np.ndarray, detections: List[Dict], frame_idx: int
    ) -> np.ndarray:
        """Draw bounding boxes, labels and HUD on frame."""
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            label  = det["class_name"]
            conf   = det["confidence"]
            colour = CLASS_COLOURS.get(label, DEFAULT_COLOUR)

            # Box
            cv2.rectangle(frame, (x1, y1), (x2, y2), colour, 2)

            # Label background
            tag  = f"{label} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 4, y1), colour, -1)
            cv2.putText(
                frame, tag, (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA,
            )

        # HUD overlay
        vehicle_count = len(detections)
        self._draw_hud(frame, frame_idx, vehicle_count)
        return frame

    @staticmethod
    def _draw_hud(frame: np.ndarray, frame_idx: int, count: int):
        """Draw top-left HUD with frame number and vehicle count."""
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (260, 55), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.45, frame, 0.55, 0, frame)
        cv2.putText(
            frame, f"TRAFFIC AI  |  Frame {frame_idx}",
            (8, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1, cv2.LINE_AA,
        )
        cv2.putText(
            frame, f"Vehicles Detected: {count}",
            (8, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA,
        )

    @staticmethod
    def _build_summary(detections_per_frame: List[Dict]) -> Dict:
        """Aggregate detection stats across all processed frames."""
        if not detections_per_frame:
            return {}

        counts = [d["count"] for d in detections_per_frame]
        class_totals: Dict[str, int] = {}
        for d in detections_per_frame:
            for obj in d["objects"]:
                name = obj["class_name"]
                class_totals[name] = class_totals.get(name, 0) + 1

        return {
            "total_detections":    sum(counts),
            "max_per_frame":       max(counts),
            "avg_per_frame":       round(sum(counts) / len(counts), 2),
            "class_totals":        class_totals,
            "peak_frame":          detections_per_frame[counts.index(max(counts))]["frame"],
        }


# Module-level singleton
_detector: Optional[VehicleDetector] = None


def get_detector() -> VehicleDetector:
    global _detector
    if _detector is None:
        _detector = VehicleDetector()
    return _detector
