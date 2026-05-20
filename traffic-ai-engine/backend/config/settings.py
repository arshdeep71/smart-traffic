from pathlib import Path

# API Server
API_HOST = "0.0.0.0"
API_PORT = 8001

# Directories
BASE_DIR = Path(__file__).parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
LOGS_DIR = BASE_DIR / "logs"

# Ensure directories exist
UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)
SNAPSHOTS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Upload limits
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_UPLOAD_MB = 100.0

# YOLO config
YOLO_MODEL = "yolov8n.pt"
YOLO_CONF_THRESHOLD = 0.5
YOLO_IOU_THRESHOLD = 0.5
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
FRAME_SKIP = 5
MAX_SNAPSHOT_PER_SESSION = 50

# Congestion config
CONGESTION_THRESHOLDS = {
    "smooth": 5,
    "moderate": 15,
    "heavy": 25,
    "critical": 40
}
CONGESTION_ALERT_SCORE = 0.8
