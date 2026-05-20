"""
alerts_engine.py
────────────────
AI-assisted alert generation engine.

Responsibilities:
  • Monitor congestion reports and tracking data.
  • Apply rule-based logic to produce typed alerts.
  • Store alert history per session.
  • Return alert lists via API.

Alert types:
  congestion | accident_suspected | traffic_spike
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from config.settings import CONGESTION_ALERT_SCORE
from utils import get_logger, timestamp_now

logger = get_logger("alerts")

# ── Severity levels ────────────────────────────────────────────────────────
SEVERITY_LOW    = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH   = "high"
SEVERITY_CRITICAL = "critical"


class AlertsEngine:
    """
    Rule-based AI alert generator.

    Usage:
        engine = AlertsEngine(session_id)
        new    = engine.evaluate(congestion_report, stationary_tracks)
        all_   = engine.get_all_alerts()
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self._alerts: List[Dict] = []
        # cooldown tracking: alert_type → last fired timestamp str
        self._cooldowns: Dict[str, float] = {}
        self._cooldown_seconds = 10.0  # demo: short cooldown so alerts appear

    # ── Public API ─────────────────────────────────────────────────────────
    def evaluate(
        self,
        congestion_report: Dict,
        stationary_tracks: List[Dict],
    ) -> List[Dict]:
        """
        Evaluate current frame state and generate zero-or-more alerts.

        Returns list of new alerts (empty if none triggered).
        """
        new_alerts: List[Dict] = []
        now = datetime.utcnow().timestamp()

        # ── Rule 1: Critical congestion ────────────────────────────────────
        if congestion_report.get("congestion_score", 0) >= CONGESTION_ALERT_SCORE:
            if self._can_fire("congestion", now):
                alert = self._build_alert(
                    alert_type="congestion",
                    severity=SEVERITY_CRITICAL,
                    message=f"Critical congestion detected — score "
                            f"{congestion_report['congestion_score']:.2f}",
                    confidence=min(congestion_report["congestion_score"] + 0.1, 1.0),
                    metadata={"state": congestion_report.get("state"),
                               "vehicle_count": congestion_report.get("vehicle_count")},
                )
                new_alerts.append(alert)
                self._cooldowns["congestion"] = now

        # ── Rule 2: Stationary vehicles (accident suspected) ───────────────
        if len(stationary_tracks) >= 2:
            if self._can_fire("accident_suspected", now):
                alert = self._build_alert(
                    alert_type="accident_suspected",
                    severity=SEVERITY_HIGH,
                    message=f"Possible incident — {len(stationary_tracks)} vehicles stationary.",
                    confidence=min(0.50 + len(stationary_tracks) * 0.05, 0.95),
                    metadata={"stationary_count": len(stationary_tracks),
                               "track_ids": [t["track_id"] for t in stationary_tracks]},
                )
                new_alerts.append(alert)
                self._cooldowns["accident_suspected"] = now

        # ── Rule 3: Sudden traffic spike ───────────────────────────────────
        count = congestion_report.get("vehicle_count", 0)
        if count >= 20:
            if self._can_fire("traffic_spike", now):
                alert = self._build_alert(
                    alert_type="traffic_spike",
                    severity=SEVERITY_MEDIUM,
                    message=f"Traffic spike — {count} vehicles in frame.",
                    confidence=0.80,
                    metadata={"vehicle_count": count},
                )
                new_alerts.append(alert)
                self._cooldowns["traffic_spike"] = now

        self._alerts.extend(new_alerts)
        if new_alerts:
            logger.info(f"[{self.session_id}] Generated {len(new_alerts)} alert(s).")
        return new_alerts

    def get_all_alerts(self) -> List[Dict]:
        return list(self._alerts)

    def get_recent_alerts(self, n: int = 20) -> List[Dict]:
        return self._alerts[-n:]

    def clear(self):
        self._alerts.clear()

    # ── Internal ───────────────────────────────────────────────────────────
    def _build_alert(
        self,
        alert_type: str,
        severity: str,
        message: str,
        confidence: float,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        return {
            "alert_id":   str(uuid.uuid4()),
            "session_id": self.session_id,
            "alert_type": alert_type,
            "severity":   severity,
            "message":    message,
            "confidence": round(confidence, 3),
            "timestamp":  timestamp_now(),
            "metadata":   metadata or {},
        }

    def _can_fire(self, alert_type: str, now: float) -> bool:
        last = self._cooldowns.get(alert_type, 0.0)
        return (now - last) >= self._cooldown_seconds
