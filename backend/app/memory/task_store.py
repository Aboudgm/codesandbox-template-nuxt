"""SQLite-backed persistence for task objects."""
from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class TaskStore:
    def __init__(self, db_path: str = "/data/tasks.db"):
        self.db_path = db_path
        self._lock = asyncio.Lock()
        self._init_db()

    def _init_db(self) -> None:
        try:
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.commit()
            conn.close()
            logger.info("TaskStore initialized at %s", self.db_path)
        except Exception as exc:
            logger.error("TaskStore init failed: %s", exc)

    def _save_sync(self, task_id: str, data: str, created_at: str) -> None:
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT OR REPLACE INTO tasks (id, data, created_at) VALUES (?, ?, ?)",
            (task_id, data, created_at),
        )
        conn.commit()
        conn.close()

    def _delete_sync(self, task_id: str) -> None:
        conn = sqlite3.connect(self.db_path)
        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        conn.close()

    def _load_all_sync(self) -> list[dict]:
        try:
            conn = sqlite3.connect(self.db_path)
            rows = conn.execute(
                "SELECT data FROM tasks ORDER BY created_at DESC"
            ).fetchall()
            conn.close()
            return [json.loads(row[0]) for row in rows]
        except Exception as exc:
            logger.error("TaskStore load_all failed: %s", exc)
            return []

    async def save(self, task_id: str, data: str, created_at: str) -> None:
        async with self._lock:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._save_sync, task_id, data, created_at)

    async def delete(self, task_id: str) -> None:
        async with self._lock:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._delete_sync, task_id)

    async def load_all(self) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._load_all_sync)


_task_store: Optional[TaskStore] = None


def get_task_store() -> TaskStore:
    global _task_store
    if _task_store is None:
        _task_store = TaskStore()
    return _task_store
