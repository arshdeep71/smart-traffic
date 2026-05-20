"""
analytics_engine.py
────────────────────
Traffic analytics aggregator.

Responsibilities:
  • Consume per-frame detection + congestion data.
  • Produce session-level traffic summaries.
  • Expose trend analytics.
  • Support /live-analytics endpoint.
"""

import time
from typing import Dict, List, Optional

from utils import get_logger, timestamp_now

logger = get_logger("analytics")


class AnalyticsEngine:
    """
    Stateful analytics accumulator for a single processing session.

    Usage:
        engine = AnalyticsEngine(session_id)
        engine.record_frame(detection_result, congestion_report, tracks)
        summary = engine.summary()
    """

    def __init__(self, session_id: str):
        self.session_id    = session_id
        self._start_time   = time.time()
        self._frames: List[Dict] = []
        self._total_vehicles_seen = 0
        self._class_counts: Dict[str, int] = {}
        self._congestion_scores: List[float] = []
        self._speed_samples: List[float] = []
        self._fps_samples: List[float] = []
        self._alert_count = 0

    # ── Public API ─────────────────────────────────────────────────────────
    def record_frame(
        self,
        frame_idx: int,
        detections: List[Dict],
        congestion_report: Dict,
        tracks: List[Dict],
        elapsed_seconds: float,
    ):
        """Ingest data from one processed frame."""
        count = len(detections)
        fps   = (frame_idx / elapsed_seconds) if elapsed_seconds > 0 else 0.0

        for det in detections:
            cls = det.get("class_name", "unknown")
            self._class_counts[cls] = self._class_counts.get(cls, 0) + 1

        self._total_vehicles_seen += count
        self._congestion_scores.append(congestion_report.get("congestion_score", 0))
        self._speed_samples.extend([t.get("speed_px", 0) for t in tracks])
        self._fps_samples.append(fps)

        self._frames.append({
            "frame_idx":        frame_idx,
            "vehicle_count":    count,
            "congestion_score": congestion_report.get("congestion_score"),
            "congestion_state": congestion_report.get("state"),
            "fps":              round(fps, 2),
        })

    def record_alert(self):
        self._alert_count += 1

    def summary(self) -> Dict:
        """Return full analytics summary for the session."""
        if not self._frames:
            return {"session_id": self.session_id, "status": "no_data"}

        elapsed      = time.time() - self._start_time
        counts       = [f["vehicle_count"] for f in self._frames]
        cong_scores  = self._congestion_scores or [0]
        speeds       = self._speed_samples or [0]
        fps_list     = self._fps_samples or [0]

        avg_cong  = sum(cong_scores) / len(cong_scores)
        peak_cong = max(cong_scores)

        # Traffic trend (last 10 vs previous 10 frames)
        recent = cong_scores[-10:]
        older  = cong_scores[-20:-10] if len(cong_scores) >= 20 else cong_scores[:max(1,len(cong_scores)-10)]
        avg_r  = sum(recent)/len(recent)
        avg_o  = sum(older)/len(older) if older else avg_r
        if   avg_r - avg_o >  0.05: trend = "worsening"
        elif avg_r - avg_o < -0.05: trend = "improving"
        else:                        trend = "stable"

        # Dominant congestion state
        states = [f["congestion_state"] for f in self._frames if f["congestion_state"]]
        dominant_state = max(set(states), key=states.count) if states else "unknown"

        return {
            "session_id":           self.session_id,
            "frames_analysed":      len(self._frames),
            "elapsed_seconds":      round(elapsed, 2),
            "total_detections":     self._total_vehicles_seen,
            "avg_vehicles_per_frame": round(sum(counts)/len(counts), 2),
            "peak_vehicles":        max(counts),
            "class_breakdown":      self._class_counts,
            "avg_congestion_score": round(avg_cong, 4),
            "peak_congestion_score": round(peak_cong, 4),
            "dominant_state":       dominant_state,
            "traffic_trend":        trend,
            "avg_speed_px":         round(sum(speeds)/len(speeds), 2),
            "avg_fps":              round(sum(fps_list)/len(fps_list), 2),
            "total_alerts":         self._alert_count,
            "generated_at":         timestamp_now(),
        }

    def live_snapshot(self) -> Dict:
        """Return lightweight snapshot of the most recent frame."""
        if not self._frames:
            return {"session_id": self.session_id, "status": "pending"}
        latest = self._frames[-1]
        return {
            "session_id":       self.session_id,
            "latest_frame":     latest,
            "avg_congestion":   round(sum(self._congestion_scores)/max(1,len(self._congestion_scores)),4),
            "total_alerts":     self._alert_count,
            "uptime_seconds":   round(time.time() - self._start_time, 1),
            "timestamp":        timestamp_now(),
        }

    def reset(self):
        self.__init__(self.session_id)
