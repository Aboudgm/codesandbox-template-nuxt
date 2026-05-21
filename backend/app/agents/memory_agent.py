"""
MemoryAgent – retrieves relevant past experience from vector and episodic stores.
"""
from __future__ import annotations

import logging
from typing import Any, Optional, TYPE_CHECKING

from app.agents.base import BaseAgent
from app.models.agent import AgentState
from app.models.task import AgentType

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager

logger = logging.getLogger(__name__)


class MemoryAgent(BaseAgent):
    """
    Searches vector store and episodic memory for context relevant to the
    current task goal.  Returns a structured summary string.
    """

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="MemoryAgent",
            agent_type=AgentType.MEMORY,
            ws_manager=ws_manager,
        )

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)

        self.send_message(
            f"Searching memory for context related to: {goal[:100]}",
            task_id=task_id,
        )

        sections: list[str] = []

        # ── Vector store search ────────────────────────────────────────
        try:
            from app.memory.vector_store import get_vector_store

            vs = get_vector_store()
            self.set_state(AgentState.ACTING)
            vector_results = await vs.search_memory(goal, n_results=5)

            if vector_results:
                self.send_message(
                    f"Found {len(vector_results)} relevant memories in vector store.",
                    task_id=task_id,
                )
                items = []
                for r in vector_results:
                    dist = r.get("distance", 1.0)
                    content = r.get("content", "")[:300]
                    items.append(f"- [relevance={1 - dist:.2f}] {content}")
                sections.append("## Relevant Vector Memories\n" + "\n".join(items))
            else:
                sections.append("## Vector Memories\nNo relevant memories found.")
        except Exception as exc:
            logger.warning("Vector store search failed: %s", exc)
            sections.append("## Vector Memories\n(unavailable)")

        # ── Episodic memory search ─────────────────────────────────────
        try:
            from app.memory.episodic import get_episodic_memory

            em = get_episodic_memory()
            episodic_results = await em.search_tasks(goal[:200])

            if episodic_results:
                self.send_message(
                    f"Found {len(episodic_results)} related past tasks.",
                    task_id=task_id,
                )
                items = []
                for r in episodic_results[:5]:
                    status = "✓" if r.get("success") else "✗"
                    items.append(
                        f"- [{status}] {r.get('goal', '')[:120]} "
                        f"(duration: {r.get('duration', 0):.1f}s)"
                    )
                sections.append("## Related Past Tasks\n" + "\n".join(items))
            else:
                sections.append("## Past Tasks\nNo similar past tasks found.")
        except Exception as exc:
            logger.warning("Episodic memory search failed: %s", exc)
            sections.append("## Past Tasks\n(unavailable)")

        result = "\n\n".join(sections)
        self.set_state(AgentState.DONE)
        self.send_message("Memory retrieval complete.", task_id=task_id)
        return result
