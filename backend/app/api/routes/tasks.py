"""Task management API routes."""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.task import Task, TaskCreate, TaskStatus, TaskUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# In-memory task store (backed by SQLite via _persist)
_tasks: dict[str, Task] = {}
_task_registry = _tasks  # alias used by agents
_running: dict[str, asyncio.Task] = {}


# ──────────────────────────────────────────────────────────────────────────────
# Persistence helpers
# ──────────────────────────────────────────────────────────────────────────────

async def _persist(task: Task) -> None:
    """Save a single task to the SQLite store (best-effort)."""
    try:
        from app.memory.task_store import get_task_store
        store = get_task_store()
        data = task.model_dump_json()
        await store.save(task.id, data, task.created_at.isoformat())
    except Exception as exc:
        logger.warning("Task persist failed: %s", exc)


async def load_tasks_from_db() -> None:
    """Load persisted tasks at startup; mark interrupted tasks as failed."""
    try:
        from app.memory.task_store import get_task_store
        store = get_task_store()
        rows = await store.load_all()
        for row in rows:
            task = Task.model_validate(row)
            # Tasks that were running/pending when the server died → failed
            if task.status in (TaskStatus.RUNNING, TaskStatus.PENDING):
                task.status = TaskStatus.FAILED
                task.updated_at = datetime.utcnow()
            _tasks[task.id] = task
        logger.info("Loaded %d tasks from store", len(rows))
    except Exception as exc:
        logger.warning("Could not load persisted tasks: %s", exc)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=Task, status_code=201)
async def create_task(payload: TaskCreate, background_tasks: BackgroundTasks) -> Task:
    task = Task(
        id=str(uuid.uuid4()),
        goal=payload.goal,
        status=TaskStatus.PENDING,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    _tasks[task.id] = task
    await _persist(task)
    background_tasks.add_task(_run_task, task.id, payload.goal)
    return task


@router.get("", response_model=list[Task])
async def list_tasks() -> list[Task]:
    return sorted(_tasks.values(), key=lambda t: t.created_at, reverse=True)


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str) -> Task:
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(404, detail="Task not found")
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str) -> None:
    if task_id not in _tasks:
        raise HTTPException(404, detail="Task not found")
    _cancel_running(task_id)
    del _tasks[task_id]
    try:
        from app.memory.task_store import get_task_store
        await get_task_store().delete(task_id)
    except Exception:
        pass


@router.post("/{task_id}/pause", response_model=Task)
async def pause_task(task_id: str) -> Task:
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(404, detail="Task not found")
    if task.status == TaskStatus.RUNNING:
        task.status = TaskStatus.PAUSED
        task.updated_at = datetime.utcnow()
        _cancel_running(task_id)
        await _persist(task)
    return task


@router.post("/{task_id}/resume", response_model=Task)
async def resume_task(task_id: str, background_tasks: BackgroundTasks) -> Task:
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(404, detail="Task not found")
    if task.status == TaskStatus.PAUSED:
        task.status = TaskStatus.PENDING
        task.updated_at = datetime.utcnow()
        await _persist(task)
        background_tasks.add_task(_run_task, task.id, task.goal)
    return task


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate) -> Task:
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(404, detail="Task not found")
    if payload.status is not None:
        task.status = payload.status
    if payload.result is not None:
        task.result = payload.result
    task.updated_at = datetime.utcnow()
    await _persist(task)
    return task


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _cancel_running(task_id: str) -> None:
    running = _running.pop(task_id, None)
    if running and not running.done():
        running.cancel()


async def _run_task(task_id: str, goal: str) -> None:
    """Launch the orchestrator for a task and update status."""
    from app.api.websocket import manager
    from app.agents.orchestrator import OrchestratorAgent

    task = _tasks.get(task_id)
    if not task:
        return

    task.status = TaskStatus.RUNNING
    task.updated_at = datetime.utcnow()
    await _persist(task)

    await manager.broadcast(task_id, {
        "type": "task_started",
        "task_id": task_id,
        "goal": goal,
    })

    try:
        agent = OrchestratorAgent(ws_manager=manager)
        agent.set_task(task_id)
        result = await agent.run(task, context={"task_id": task_id})

        task.status = TaskStatus.COMPLETED
        task.result = result
        task.updated_at = datetime.utcnow()

        for msg in agent.message_history:
            task.messages.append(msg)

        await _persist(task)

        await manager.broadcast(task_id, {
            "type": "task_completed",
            "task_id": task_id,
            "result": result,
        })

    except asyncio.CancelledError:
        task.status = TaskStatus.PAUSED
        task.updated_at = datetime.utcnow()
        await _persist(task)
    except Exception as exc:
        logger.exception("Task %s failed: %s", task_id, exc)
        task.status = TaskStatus.FAILED
        task.updated_at = datetime.utcnow()
        await _persist(task)
        await manager.broadcast(task_id, {
            "type": "task_failed",
            "task_id": task_id,
            "error": str(exc),
        })
    finally:
        _running.pop(task_id, None)
