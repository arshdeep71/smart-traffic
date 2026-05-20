"""
congestion_engine.py
────────────────────
Traffic congestion analysis engine.

Responsibilities:
  • Calculate vehicle density per frame.
  • Estimate congestion severity (smooth / moderate / heavy / critical).
  • Produce a normalised congestion score [0 … 1].
  • Classify traffic state and generate trend history.
"""

from typing import Dict, List, Optional
from config.settings import CONGESTION_THRESHOLDS
from utils import get_logger

logger = get_logger("congestion")

# Weight factors for congestion score
W_DENSITY    = 0.50
W_STATIONARY = 0.30
W_SPEED      = 0.20

# Expected max vehicles in a frame (for normalisation)
MAX_VEHICLES_EXPECTED = 30
# Speed ceiling (px/frame) – above this = free flow
SPEED_FREE_FLOW = 20.0


class CongestionEngine:
    """
    Analyses per-frame tracking data to produce a congestion assessment.

    Usage:
        engine = CongestionEngine()
        report = engine.analyse(tracks, frame_area)
    """

    def __init__(self, history_size: int = 60):
        self._history: List[Dict] = []
        self._history_size = history_size

    # ── Public API ─────────────────────────────────────────────────────────
    def analyse(
        self,
        tracks: List[Dict],
        frame_area: Optional[int] = None,
    ) -> Dict:
        """
        Compute congestion metrics from current-frame tracking data.

        Args:
            tracks:     list of track dicts from VehicleTracker.update()
            frame_area: pixel area of the frame (used for density calc)

        Returns:
            congestion report dict
        """
        vehicle_count    = len(tracks)
        stationary_count = sum(1 for t in tracks if t.get("is_stationary"))
        speeds           = [t.get("speed_px", 0) for t in tracks]
        avg_speed        = (sum(speeds) / len(speeds)) if speeds else 0.0

        # --- component scores [0, 1] ---
        density_score     = min(vehicle_count / MAX_VEHICLES_EXPECTED, 1.0)
        stationary_ratio  = (stationary_count / vehicle_count) if vehicle_count else 0.0
        speed_score       = max(0.0, 1.0 - (avg_speed / SPEED_FREE_FLOW))

        congestion_score  = (
            W_DENSITY    * density_score    +
            W_STATIONARY * stationary_ratio +
            W_SPEED      * speed_score
        )
        congestion_score = round(min(congestion_score, 1.0), 4)

        state = self._classify(vehicle_count)
        report = {
            "vehicle_count":    vehicle_count,
            "stationary_count": stationary_count,
            "avg_speed_px":     round(avg_speed, 2),
            "density_score":    round(density_score, 4),
            "stationary_ratio": round(stationary_ratio, 4),
            "speed_score":      round(speed_score, 4),
            "congestion_score": congestion_score,
            "state":            state,
        }

        self._history.append(report)
        if len(self._history) > self._history_size:
            self._history.pop(0)

        return report

    def trend_summary(self) -> Dict:
        """Aggregate stats over recent history."""
        if not self._history:
            return {"trend": "no_data"}

        scores = [h["congestion_score"] for h in self._history]
        states = [h["state"] for h in self._history]
        recent = scores[-10:]
        older  = scores[-20:-10] if len(scores) >= 20 else scores[:max(1, len(scores)-10)]

        avg_recent = sum(recent) / len(recent)
        avg_older  = sum(older)  / len(older) if older else avg_recent
        delta      = avg_recent - avg_older

        if   delta >  0.05: trend = "worsening"
        elif delta < -0.05: trend = "improving"
        else:               trend = "stable"

        return {
            "trend":              trend,
            "avg_congestion":     round(sum(scores) / len(scores), 4),
            "peak_congestion":    round(max(scores), 4),
            "dominant_state":     max(set(states), key=states.count),
            "history_length":     len(self._history),
        }

    def reset(self):
        self._history.clear()

    # ── Internal ───────────────────────────────────────────────────────────
    @staticmethod
    def _classify(vehicle_count: int) -> str:
        for state, (lo, hi) in CONGESTION_THRESHOLDS.items():
            if lo <= vehicle_count <= hi:
                return state
        return "critical"
