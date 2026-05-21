"""
NEXUS AI — Multi-Agent Framework
FastAPI application entry point.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup; clean up on shutdown."""
    logger.info("Starting NEXUS AI backend…")

    # Ensure data directories exist
    for d in ["/data/workspace/reports", "/data/logs", "/data/chroma"]:
        Path(d).mkdir(parents=True, exist_ok=True)

    # Pre-warm memory systems (best-effort)
    try:
        from app.memory.vector_store import get_vector_store
        get_vector_store()
        logger.info("Vector store initialized")
    except Exception as exc:
        logger.warning("Vector store init failed (non-fatal): %s", exc)

    try:
        from app.memory.episodic import get_episodic_memory
        get_episodic_memory()
        logger.info("Episodic memory initialized")
    except Exception as exc:
        logger.warning("Episodic memory init failed (non-fatal): %s", exc)

    try:
        from app.memory.task_store import get_task_store
        get_task_store()
        from app.api.routes.tasks import load_tasks_from_db
        await load_tasks_from_db()
        logger.info("Task store initialized")
    except Exception as exc:
        logger.warning("Task store init failed (non-fatal): %s", exc)

    logger.info("NEXUS AI backend ready ✓")
    yield
    logger.info("Shutting down NEXUS AI backend…")


app = FastAPI(
    title="NEXUS AI — Multi-Agent Framework",
    description="Advanced multi-agent AI system with web research, code execution, and persistent memory.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ────────────────────────────────────────────────────────────────
from app.api.routes.tasks import router as tasks_router
from app.api.routes.agents import router as agents_router
from app.api.routes.memory import router as memory_router
from app.api.routes.config import router as config_router

app.include_router(tasks_router)
app.include_router(agents_router)
app.include_router(memory_router)
app.include_router(config_router)


# ─── WebSocket endpoint ──────────────────────────────────────────────────────
@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str) -> None:
    from app.api.websocket import manager

    await manager.connect(websocket, task_id)
    try:
        while True:
            # Keep connection alive; real messages come from agents
            data = await websocket.receive_text()
            # Echo back (clients can send ping)
            await manager.send_personal(websocket, {"type": "pong", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)


# ─── Stats ───────────────────────────────────────────────────────────────────
@app.get("/api/stats", tags=["system"])
async def get_stats() -> dict:
    from app.api.routes.tasks import _tasks
    total_tasks = len(_tasks)
    try:
        from app.memory.vector_store import get_vector_store
        memories_stored = await get_vector_store().collection_count("default")
    except Exception:
        memories_stored = 0
    return {
        "total_tasks": total_tasks,
        "memories_stored": memories_stored,
        "agents_available": 5,
    }


# ─── Health check ────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check() -> JSONResponse:
    from app.config import settings
    return JSONResponse({
        "status": "ok",
        "version": "1.0.0",
        "providers_configured": {
            "anthropic": bool(settings.api_keys.anthropic),
            "openai": bool(settings.api_keys.openai),
            "gemini": bool(settings.api_keys.google_gemini),
        },
    })


# ─── Root ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["system"])
async def root() -> dict:
    return {
        "name": "NEXUS AI",
        "description": "Multi-Agent AI Framework",
        "docs": "/api/docs",
        "health": "/health",
    }


# ─── Static files (must be last – catch-all) ────────────────────────────────
_static_dir = Path(__file__).parent.parent / "static"
if _static_dir.exists():
    app.mount(
        "/static",
        StaticFiles(directory=str(_static_dir)),
        name="static",
    )
