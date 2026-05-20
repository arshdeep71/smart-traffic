"""
tracker.py
──────────
Vehicle tracking system.

Responsibilities:
  • Assign persistent tracking IDs across frames.
  • Estimate movement direction (N/S/E/W/stationary).
  • Estimate approximate pixel-speed per frame.
  • Maintain motion trails (last N centre positions).
  • Detect stationary vehicles (potential accident signal).
"""

import math
from collections import deque
from typing import Dict, List, Optional, Tuple, Any

from utils import get_logger

logger = get_logger("tracker")

# ── Constants ──────────────────────────────────────────────────────────────
MAX_TRAIL_LENGTH       = 20     # how many historical centres to keep
IOU_MATCH_THRESHOLD    = 0.25   # IoU needed to re-associate a detection
MAX_MISS_FRAMES        = 15     # frames allowed without a detection before dropping
STATIONARY_SPEED_PX    = 4.0    # px/frame below which vehicle is "stationary"
STATIONARY_FRAME_LIMIT = 30     # frames stationary before flagged


def _iou(b1: List[int], b2: List[int]) -> float:
    """Intersection-over-Union of two [x1,y1,x2,y2] boxes."""
    ix1 = max(b1[0], b2[0]); iy1 = max(b1[1], b2[1])
    ix2 = min(b1[2], b2[2]); iy2 = min(b1[3], b2[3])
    iw = max(0, ix2 - ix1); ih = max(0, iy2 - iy1)
    inter = iw * ih
    a1 = (b1[2]-b1[0]) * (b1[3]-b1[1])
    a2 = (b2[2]-b2[0]) * (b2[3]-b2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


def _direction(dx: float, dy: float) -> str:
    """Cardinal direction from displacement vector."""
    if abs(dx) < STATIONARY_SPEED_PX and abs(dy) < STATIONARY_SPEED_PX:
        return "stationary"
    angle = math.degrees(math.atan2(-dy, dx))  # y-axis flipped in image coords
    if   -45  <= angle <  45:  return "east"
    elif  45  <= angle < 135:  return "north"
    elif -135 <= angle < -45:  return "south"
    else:                       return "west"


class TrackedVehicle:
    """State for a single tracked vehicle."""

    def __init__(self, track_id: int, detection: Dict):
        self.track_id          = track_id
        self.class_name        = detection["class_name"]
        self.bbox              = detection["bbox"]
        self.trail: deque      = deque([detection["center"]], maxlen=MAX_TRAIL_LENGTH)
        self.miss_frames       = 0
        self.stationary_frames = 0
        self.speed_px          = 0.0
        self.direction         = "unknown"

    def update(self, detection: Dict):
        prev_center = self.trail[-1]
        new_center  = detection["center"]
        dx = new_center[0] - prev_center[0]
        dy = new_center[1] - prev_center[1]
        self.speed_px  = math.hypot(dx, dy)
        self.direction = _direction(dx, dy)
        self.bbox      = detection["bbox"]
        self.trail.append(new_center)
        self.miss_frames = 0
        if self.direction == "stationary":
            self.stationary_frames += 1
        else:
            self.stationary_frames = 0

    def mark_missing(self):
        self.miss_frames += 1

    @property
    def is_stationary(self) -> bool:
        return self.stationary_frames >= STATIONARY_FRAME_LIMIT

    def to_dict(self) -> Dict:
        return {
            "track_id":          self.track_id,
            "class_name":        self.class_name,
            "bbox":              self.bbox,
            "center":            list(self.trail[-1]) if self.trail else None,
            "trail":             [list(p) for p in self.trail],
            "speed_px":          round(self.speed_px, 2),
            "direction":         self.direction,
            "stationary_frames": self.stationary_frames,
            "is_stationary":     self.is_stationary,
        }


class VehicleTracker:
    """
    Simple IoU-based multi-object tracker.

    Usage:
        tracker = VehicleTracker()
        tracked = tracker.update(detections_list)  # call each frame
    """

    def __init__(self):
        self._tracks: Dict[int, TrackedVehicle] = {}
        self._next_id = 1

    def update(self, detections: List[Dict]) -> List[Dict]:
        """
        Match new detections to existing tracks, assign IDs.

        Args:
            detections: list of detection dicts from VehicleDetector._detect_frame()

        Returns:
            List of track dicts (includes track_id, trail, direction, speed …)
        """
        unmatched_detections = list(range(len(detections)))
        matched_track_ids    = set()

        # --- greedy IoU matching ---
        for tid, track in list(self._tracks.items()):
            best_iou   = IOU_MATCH_THRESHOLD
            best_didx  = None
            for didx in unmatched_detections:
                iou = _iou(track.bbox, detections[didx]["bbox"])
                if iou > best_iou:
                    best_iou  = iou
                    best_didx = didx

            if best_didx is not None:
                track.update(detections[best_didx])
                matched_track_ids.add(tid)
                unmatched_detections.remove(best_didx)
            else:
                track.mark_missing()

        # --- remove stale tracks ---
        stale = [tid for tid, t in self._tracks.items() if t.miss_frames > MAX_MISS_FRAMES]
        for tid in stale:
            del self._tracks[tid]

        # --- create new tracks for unmatched detections ---
        for didx in unmatched_detections:
            new_track = TrackedVehicle(self._next_id, detections[didx])
            self._tracks[self._next_id] = new_track
            self._next_id += 1

        return [t.to_dict() for t in self._tracks.values()]

    def get_stationary_vehicles(self) -> List[Dict]:
        return [t.to_dict() for t in self._tracks.values() if t.is_stationary]

    def reset(self):
        self._tracks.clear()
        self._next_id = 1
