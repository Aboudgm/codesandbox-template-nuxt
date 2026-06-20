"""WebSocket + SSE event infrastructure — NEXUS AI v2.0."""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any, TYPE_CHECKING

from fastapi import WebSocket

if TYPE_CHECKING:
    from app.models.event import StreamEvent

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and SSE event queues per task."""

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)
        # SSE: task_id → list of asyncio.Queue (one per connected SSE client)
        self._sse_queues: dict[str, list[asyncio.Queue]] = defaultdict(list)

    # ── WebSocket ──────────────────────────────────────────────────────────────

    async def connect(self, websocket: WebSocket, task_id: str) -> None:
        await websocket.accept()
        self._connections[task_id].append(websocket)

    def disconnect(self, websocket: WebSocket, task_id: str) -> None:
        conns = self._connections.get(task_id, [])
        if websocket in conns:
            conns.remove(websocket)

    async def send_personal(self, websocket: WebSocket, message: dict[str, Any]) -> None:
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception:
            pass

    async def broadcast(self, task_id: str, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._connections.get(task_id, [])):
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, task_id)

    # ── SSE queues ─────────────────────────────────────────────────────────────

    def subscribe_sse(self, task_id: str) -> asyncio.Queue:
        """Register a new SSE subscriber. Returns a queue to poll."""
        q: asyncio.Queue = asyncio.Queue(maxsize=2000)
        self._sse_queues[task_id].append(q)
        return q

    def unsubscribe_sse(self, task_id: str, q: asyncio.Queue) -> None:
        queues = self._sse_queues.get(task_id, [])
        if q in queues:
            queues.remove(q)

    async def emit(self, task_id: str, event: "StreamEvent") -> None:
        """Broadcast a StreamEvent to all SSE queues AND WebSocket clients."""
        payload = event.model_dump(mode="json")
        # SSE queues
        for q in list(self._sse_queues.get(task_id, [])):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass
        # WebSocket broadcast
        await self.broadcast(task_id, {"type": "stream_event", **payload})

    async def emit_done(self, task_id: str) -> None:
        """Signal end-of-stream to all SSE subscribers (None sentinel)."""
        for q in list(self._sse_queues.pop(task_id, [])):
            try:
                q.put_nowait(None)
            except asyncio.QueueFull:
                pass

    def active_task_ids(self) -> list[str]:
        return list(self._connections.keys())


manager = ConnectionManager()
