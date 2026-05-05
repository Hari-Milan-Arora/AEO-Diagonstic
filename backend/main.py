"""
AEO Diagnostic Engine — FastAPI Entry Point
Serves the API and frontend static files.
"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers.diagnostic import router as diagnostic_router

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="AEO Diagnostic Engine",
    description="Enterprise-grade Answer Engine Optimization diagnostic system",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(diagnostic_router)


@app.get("/api/health")
async def root_health():
    return {
        "status": "ok",
        "app": "AEO Diagnostic Engine",
        "version": "2.0.0",
        "mode": "simulation",
    }

# Serve frontend static files
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(str(FRONTEND_DIR / "index.html"))

    @app.get("/{path:path}")
    async def serve_static(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = FRONTEND_DIR / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
