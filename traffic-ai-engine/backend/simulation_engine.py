"""
simulation_engine.py
────────────────────
Classroom demo simulation engine.

Responsibilities:
  • Generate realistic-looking fake traffic states.
  • Simulate congestion spikes and incidents on demand.
  • Produce simulated camera feeds for demo dashboards.
  • Allow triggering specific scenarios via API.

This module does NOT touch real video — it only generates
synthetic data structures that can be returned by API
endpoints to make the demo visually impressive even without
a real traffic video.
"""

import random
import math
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from utils import get_logger, timestamp_now, new_session_id

logger = get_logger("simulation")

# ── Scenario presets ───────────────────────────────────────────────────────
SCENARIOS = {
    "normal": {
        "vehicle_count_range": (4, 10),
        "congestion_state":    "smooth",
        "congestion_score":    (0.10, 0.35),
        "incident_prob":       0.01,
    },
    "busy": {
        "vehicle_count_range": (11, 18),
        "congestion_state":    "moderate",
        "congestion_score":    (0.36, 0.65),
        "incident_prob":       0.03,
    },
    "congested": {
        "vehicle_count_range": (19, 26),
        "congestion_state":    "heavy",
        "congestion_score":    (0.66, 0.80),
        "incident_prob":       0.06,
    },
    "critical": {
        "vehicle_count_range": (27, 35),
        "congestion_state":    "critical",
        "congestion_score":    (0.81, 1.00),
        "incident_prob":       0.12,
    },
    "incident": {
        "vehicle_count_range": (15, 22),
        "congestion_state":    "heavy",
        "congestion_score":    (0.70, 0.90),
        "incident_prob":       1.00,   # always triggers incident alert
    },
}

CAMERA_LOCATIONS = [
    {"id": "CAM-01", "location": "Main Street Intersection",   "lat": 30.7500, "lon": 76.7800},
    {"id": "CAM-02", "location": "Highway Overpass North",     "lat": 30.7550, "lon": 76.7850},
    {"id": "CAM-03", "location": "Central Market Roundabout",  "lat": 30.7460, "lon": 76.7760},
    {"id": "CAM-04", "location": "Airport Road Junction",       "lat": 30.7600, "lon": 76.7900},
    {"id": "CAM-05", "location": "Industrial Zone Gate",        "lat": 30.7420, "lon": 76.7700},
]


class SimulationEngine:
    """
    Generates realistic synthetic traffic data for classroom demos.

    Usage:
        sim = SimulationEngine()
        state = sim.tick("busy")        # get one frame of simulated data
        feeds = sim.camera_feeds()      # get all simulated camera states
        sim.trigger_incident("CAM-03")  # manually trigger an incident
    """

    def __init__(self):
        self._camera_states: Dict[str, Dict] = {}
        self._incident_cams: set = set()
        self._frame = 0
        self._init_cameras()

    # ── Public API ─────────────────────────────────────────────────────────
    def tick(self, scenario: str = "normal") -> Dict:
        """
        Advance one simulation tick and return synthetic analytics.

        Args:
            scenario: one of "normal" | "busy" | "congested" | "critical" | "incident"

        Returns:
            dict compatible with /live-analytics response schema
        """
        self._frame += 1
        preset = SCENARIOS.get(scenario, SCENARIOS["normal"])

        vehicle_count = random.randint(*preset["vehicle_count_range"])
        cong_lo, cong_hi = preset["congestion_score"]
        congestion_score = round(random.uniform(cong_lo, cong_hi), 4)

        stationary_count = int(vehicle_count * random.uniform(0.0, 0.25))
        avg_speed        = round(random.uniform(2, 18) if scenario != "critical" else random.uniform(0, 4), 2)

        incident_occurred = random.random() < preset["incident_prob"]
        alerts_sim        = []

        if incident_occurred:
            alerts_sim.append({
                "alert_id":   str(uuid.uuid4()),
                "alert_type": "accident_suspected",
                "severity":   "high",
                "message":    f"Simulated incident — {stationary_count} stationary vehicles.",
                "confidence": round(random.uniform(0.72, 0.94), 3),
                "timestamp":  timestamp_now(),
            })

        if congestion_score >= 0.75:
            alerts_sim.append({
                "alert_id":   str(uuid.uuid4()),
                "alert_type": "congestion",
                "severity":   "critical",
                "message":    f"Simulated critical congestion — score {congestion_score}.",
                "confidence": round(random.uniform(0.85, 0.98), 3),
                "timestamp":  timestamp_now(),
            })

        # Update a random camera state
        cam = random.choice(CAMERA_LOCATIONS)
        self._camera_states[cam["id"]] = {
            **cam,
            "vehicle_count":    vehicle_count,
            "congestion_state": preset["congestion_state"],
            "congestion_score": congestion_score,
            "last_updated":     timestamp_now(),
        }

        return {
            "frame":             self._frame,
            "scenario":          scenario,
            "vehicle_count":     vehicle_count,
            "stationary_count":  stationary_count,
            "avg_speed_px":      avg_speed,
            "congestion_score":  congestion_score,
            "congestion_state":  preset["congestion_state"],
            "processing_fps":    round(random.uniform(14, 28), 1),
            "simulated_alerts":  alerts_sim,
            "timestamp":         timestamp_now(),
        }

    def camera_feeds(self) -> List[Dict]:
        """Return current simulated state of all cameras."""
        feeds = []
        for cam in CAMERA_LOCATIONS:
            state = self._camera_states.get(cam["id"])
            if state:
                feeds.append(state)
            else:
                feeds.append({
                    **cam,
                    "vehicle_count":    random.randint(0, 8),
                    "congestion_state": "smooth",
                    "congestion_score": round(random.uniform(0.05, 0.30), 3),
                    "last_updated":     timestamp_now(),
                })
        return feeds

    def trigger_incident(self, camera_id: Optional[str] = None) -> Dict:
        """Manually trigger an incident on a specific or random camera."""
        cam = (
            next((c for c in CAMERA_LOCATIONS if c["id"] == camera_id), None)
            or random.choice(CAMERA_LOCATIONS)
        )
        incident_data = {
            **cam,
            "vehicle_count":    random.randint(12, 20),
            "congestion_state": "critical",
            "congestion_score": round(random.uniform(0.80, 0.98), 3),
            "incident_flag":    True,
            "last_updated":     timestamp_now(),
        }
        self._camera_states[cam["id"]] = incident_data
        logger.info(f"Incident triggered on {cam['id']} — {cam['location']}")
        return incident_data

    def congestion_spike(self) -> Dict:
        """Simulate a sudden congestion spike and return tick data."""
        return self.tick("critical")

    # ── Internal ───────────────────────────────────────────────────────────
    def _init_cameras(self):
        for cam in CAMERA_LOCATIONS:
            self._camera_states[cam["id"]] = {
                **cam,
                "vehicle_count":    random.randint(1, 6),
                "congestion_state": "smooth",
                "congestion_score": round(random.uniform(0.05, 0.25), 3),
                "last_updated":     timestamp_now(),
            }


# Module-level singleton
_sim: Optional[SimulationEngine] = None


def get_simulation() -> SimulationEngine:
    global _sim
    if _sim is None:
        _sim = SimulationEngine()
    return _sim
