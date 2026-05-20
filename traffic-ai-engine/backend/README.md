# 🚦 Traffic AI Engine

> AI-powered smart-city traffic surveillance backend — modular, local, demo-ready.

---

## What This Is

A standalone AI microservice that:

- Accepts uploaded CCTV/dashcam traffic videos (MP4)
- Runs **YOLOv8** to detect vehicles (car, motorcycle, bus, truck)
- Tracks each vehicle across frames with unique IDs + speed + direction
- Analyses **traffic congestion** in real time
- Generates **AI-assisted incident alerts** (congestion, accident suspected, traffic spike)
- Exposes everything via clean **FastAPI REST endpoints**
- Includes a **simulation engine** for impressive classroom demos without real video

---

## Folder Structure

```
traffic-ai-engine/
├── backend/          ← Complete AI backend (FastAPI + YOLO + CV)
├── frontend/         ← Placeholder (not built — connect your own UI)
├── videos/           ← Store raw traffic videos here
├── outputs/          ← Processed output videos land here
├── snapshots/        ← Detection frame snapshots
└── logs/             ← Processing logs
```

---

## Getting Started

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Open **http://localhost:8000/docs**

---

## Demo Mode (No Video Required)

```bash
# Simulate critical congestion
curl "http://localhost:8000/live-analytics?use_simulation=true&scenario=critical"

# Trigger an incident
curl -X POST "http://localhost:8000/simulate/incident"

# Get simulated alerts
curl "http://localhost:8000/alerts?use_simulation=true&scenario=incident"

# View all camera feeds
curl "http://localhost:8000/camera-feeds"
```

---

## Existing Projects (Untouched)

```
traffic-backend/     ← Laravel backend  (NOT modified)
traffic-frontend/    ← React frontend   (NOT modified)
```

This AI engine is a completely independent microservice.

---

See `backend/README.md` for full API reference and architecture details.
