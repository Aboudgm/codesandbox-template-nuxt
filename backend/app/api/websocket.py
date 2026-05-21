"""WebSocket connection manager for real-time agent updates."""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections per task_id."""

    def __init__(self) -> None:
        # task_id -> list of websocket connections
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, task_id: str) -> None:
        await websocket.accept()
        self._connections[task_id].append(websocket)
        logger.info("WebSocket connected for task %s", task_id)

    def disconnect(self, websocket: WebSocket, task_id: str) -> None:
        conns = self._connections.get(task_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(task_id, None)
        logger.info("WebSocket disconnected for task %s", task_id)

    async def broadcast(self, task_id: str, message: dict[str, Any]) -> None:
        """Send a JSON message to all clients watching task_id."""
        dead: list[WebSocket] = []
        for ws in list(self._connections.get(task_id, [])):
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, task_id)

    async def send_personal(self, websocket: WebSocket, message: dict[str, Any]) -> None:
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception as exc:
            logger.warning("Failed to send personal message: %s", exc)

    def active_task_ids(self) -> list[str]:
        return list(self._connections.keys())


# Global singleton
manager = ConnectionManager()
