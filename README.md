# 🔍 AEO Diagnostic Engine v2.0

**Enterprise-grade Answer Engine Optimization diagnostic system** — Evaluate how your brand performs across AI-generated answers with ML-powered scoring.

## Features

- **Multi-AI Simulation**: ChatGPT, Claude, Gemini, and Ollama responses
- **10-Phase Pipeline**: Query Gen → AI Responses → Consensus → Feature Extraction → ML Scoring → Brand Analysis → Output → Aggregation → Predictions → Action Plan
- **ML Scoring Layer**: Visibility, Authority, Relevance, Trust (0–10) with weighted ensemble logic
- **Predictive Insights**: Future ranking probability, trend projections, competitor risk
- **Cross-AI Consensus Engine**: Weighted brand mention detection across 4 models
- **30-Day Action Plan**: Prioritized roadmap with AI-specific optimization
- **Interactive Charts**: Radar, bar, gauge, trend line, horizontal bars (Canvas-based)
- **Real-time Progress**: SSE streaming with 10-phase visual tracker

## Quick Start

### Windows
```
start.bat
```

### Manual
```bash
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Pydantic |
| Frontend | HTML, CSS, Vanilla JS |
| Charts | Canvas API (zero deps) |
| ML | Weighted ensemble scoring |
| Streaming | Server-Sent Events (SSE) |

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings & env vars
│   ├── routers/diagnostic.py # API endpoints
│   ├── services/            # 10-phase pipeline
│   ├── models/              # Pydantic schemas
│   └── utils/               # NLP & helpers
├── frontend/
│   ├── index.html           # SPA shell
│   ├── index.css            # Design system
│   ├── app.js               # Main controller
│   ├── api.js               # Backend client
│   ├── charts.js            # Chart library
│   └── components.js        # UI renderers
├── start.bat                # One-click launcher
└── README.md
```