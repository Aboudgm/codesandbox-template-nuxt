"""
SQLAlchemy-based episodic memory for persisting task histories.
Uses SQLite at /data/episodic.db by default.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine, or_, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


class TaskRecord(Base):
    __tablename__ = "task_records"

    id = Column(String(36), primary_key=True)
    goal = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    duration = Column(Float, nullable=True)  # seconds
    success = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class EpisodicMemory:
    """
    Manages a SQLite database of completed task records.
    All public methods are async-friendly (run sync ORM code in executor).
    """

    def __init__(self, db_path: str = "/data/episodic.db"):
        self.db_path = db_path
        self._engine = None
        self._SessionLocal = None
        self._init_db()

    def _init_db(self) -> None:
        try:
            import os
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        except Exception:
            pass

        try:
            self._engine = create_engine(
                f"sqlite:///{self.db_path}",
                connect_args={"check_same_thread": False},
                echo=False,
            )
            Base.metadata.create_all(self._engine)
            self._SessionLocal = sessionmaker(
                autocommit=False, autoflush=False, bind=self._engine
            )
            logger.info("Episodic memory DB initialized at %s", self.db_path)
        except Exception as exc:
            logger.error("EpisodicMemory init failed: %s", exc)
            self._engine = None
            self._SessionLocal = None

    def _get_session(self) -> Session:
        if self._SessionLocal is None:
            raise RuntimeError("Database not initialized")
        return self._SessionLocal()

    def _save_task_sync(
        self,
        task_id: str,
        goal: str,
        summary: Optional[str],
        result: Optional[str],
        duration: Optional[float],
        success: bool,
    ) -> TaskRecord:
        record = TaskRecord(
            id=task_id,
            goal=goal,
            summary=summary,
            result=result,
            duration=duration,
            success=success,
        )
        with self._get_session() as session:
            # Upsert: merge handles both insert and update
            session.merge(record)
            session.commit()
        return record

    async def save_task(
        self,
        task_id: str,
        goal: str,
        summary: Optional[str] = None,
        result: Optional[str] = None,
        duration: Optional[float] = None,
        success: bool = False,
    ) -> TaskRecord:
        """Persist a completed task to episodic memory."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._save_task_sync,
            task_id,
            goal,
            summary,
            result,
            duration,
            success,
        )

    def _get_recent_tasks_sync(self, n: int = 10) -> list[dict]:
        with self._get_session() as session:
            records = (
                session.execute(
                    select(TaskRecord)
                    .order_by(TaskRecord.created_at.desc())
                    .limit(n)
                )
                .scalars()
                .all()
            )
            return [self._record_to_dict(r) for r in records]

    async def get_recent_tasks(self, n: int = 10) -> list[dict]:
        """Return the n most recent task records."""
        if self._engine is None:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._get_recent_tasks_sync, n)

    def _search_tasks_sync(self, query: str) -> list[dict]:
        pattern = f"%{query}%"
        with self._get_session() as session:
            records = (
                session.execute(
                    select(TaskRecord).where(
                        or_(
                            TaskRecord.goal.like(pattern),
                            TaskRecord.summary.like(pattern),
                            TaskRecord.result.like(pattern),
                        )
                    )
                    .order_by(TaskRecord.created_at.desc())
                    .limit(20)
                )
                .scalars()
                .all()
            )
            return [self._record_to_dict(r) for r in records]

    async def search_tasks(self, query: str) -> list[dict]:
        """Full-text search over goal, summary, and result fields."""
        if self._engine is None:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._search_tasks_sync, query)

    def _get_stats_sync(self) -> dict:
        with self._get_session() as session:
            total = session.execute(
                select(TaskRecord)
            ).scalars().all()
            total_count = len(total)
            success_count = sum(1 for r in total if r.success)
            avg_duration = (
                sum(r.duration for r in total if r.duration is not None) / total_count
                if total_count > 0
                else 0.0
            )
            return {
                "total_tasks": total_count,
                "successful_tasks": success_count,
                "failed_tasks": total_count - success_count,
                "success_rate": (success_count / total_count) if total_count > 0 else 0.0,
                "average_duration_seconds": round(avg_duration, 2),
            }

    async def get_stats(self) -> dict:
        """Return aggregate statistics about all stored tasks."""
        if self._engine is None:
            return {
                "total_tasks": 0,
                "successful_tasks": 0,
                "failed_tasks": 0,
                "success_rate": 0.0,
                "average_duration_seconds": 0.0,
            }
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._get_stats_sync)

    @staticmethod
    def _record_to_dict(r: TaskRecord) -> dict:
        return {
            "id": r.id,
            "goal": r.goal,
            "summary": r.summary,
            "result": r.result,
            "duration": r.duration,
            "success": r.success,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }


# Global singleton
_episodic_memory: Optional[EpisodicMemory] = None


def get_episodic_memory() -> EpisodicMemory:
    global _episodic_memory
    if _episodic_memory is None:
        from app.config import settings

        _episodic_memory = EpisodicMemory(
            db_path=settings.memory.episodic_db_path
        )
    return _episodic_memory
