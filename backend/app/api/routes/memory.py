"""Memory API routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/memory", tags=["memory"])
logger = logging.getLogger(__name__)


@router.get("/search")
async def search_memory(q: str = Query(..., description="Search query")) -> list[dict]:
    """Semantic search over the vector store."""
    try:
        from app.memory.vector_store import get_vector_store

        vs = get_vector_store()
        results = await vs.search_memory(q)
        return results
    except Exception as exc:
        logger.warning("Memory search failed: %s", exc)
        return []


@router.get("/recent")
async def get_recent_memories() -> list[dict]:
    """Return the 10 most recent episodic task records."""
    try:
        from app.memory.episodic import get_episodic_memory

        em = get_episodic_memory()
        return await em.get_recent_tasks(10)
    except Exception as exc:
        logger.warning("Episodic memory retrieval failed: %s", exc)
        return []


@router.get("/stats")
async def get_memory_stats() -> dict:
    """Return aggregate statistics from both memory stores."""
    try:
        from app.memory.episodic import get_episodic_memory
        from app.memory.vector_store import get_vector_store

        em = get_episodic_memory()
        vs = get_vector_store()

        episodic_stats = await em.get_stats()
        vector_count = await vs.collection_count("default")

        return {
            "episodic": episodic_stats,
            "vector": {
                "default_collection_count": vector_count,
            },
        }
    except Exception as exc:
        logger.warning("Stats failed: %s", exc)
        return {"episodic": {}, "vector": {"default_collection_count": 0}}


@router.delete("/{memory_id}", status_code=204)
async def delete_memory(memory_id: str) -> None:
    """Delete a memory entry from the vector store."""
    try:
        from app.memory.vector_store import get_vector_store

        vs = get_vector_store()
        deleted = await vs.delete_memory(memory_id)
        if not deleted:
            raise HTTPException(404, detail="Memory not found")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, detail=str(exc))
