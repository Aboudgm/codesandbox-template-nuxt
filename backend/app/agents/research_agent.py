"""
ResearchAgent – gathers information via web search and stores findings in memory.
"""
from __future__ import annotations

import logging
from typing import Any, Optional, TYPE_CHECKING

from app.agents.base import BaseAgent
from app.agents.llm_client import llm_complete
from app.models.agent import AgentState
from app.models.task import AgentType
from app.tools.web_search import WebSearchTool

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager

logger = logging.getLogger(__name__)

_SUMMARIZE_SYSTEM = (
    "You are a research assistant. Summarize the provided web search results "
    "into a concise, well-structured report. Focus on factual, relevant information. "
    "Use Markdown formatting."
)


class ResearchAgent(BaseAgent):
    """
    Searches the web for information relevant to the task goal,
    stores findings in the vector store, and returns a structured summary.
    """

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="ResearchAgent",
            agent_type=AgentType.RESEARCHER,
            ws_manager=ws_manager,
        )
        self._search_tool = WebSearchTool()

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)

        self.send_message(f"Starting research for: {goal[:120]}", task_id=task_id)

        # ── Step 1: Web search ─────────────────────────────────────────
        self.set_state(AgentState.ACTING)
        self.send_message("Searching the web…", task_id=task_id)

        search_results = await self._search_tool.search(goal, max_results=5)

        if not search_results:
            self.send_message("No search results found. Returning empty research.", task_id=task_id)
            self.set_state(AgentState.DONE)
            return "No web search results were found for this query."

        self.send_message(
            f"Found {len(search_results)} results. Fetching page content…",
            task_id=task_id,
        )

        # ── Step 2: Fetch page content ─────────────────────────────────
        snippets: list[str] = []
        for i, result in enumerate(search_results[:3]):  # limit to 3 pages
            url = result.get("url", "")
            title = result.get("title", "No title")
            snippet = result.get("snippet", "")
            if url:
                self.send_message(f"Fetching: {title} ({url[:60]}…)", task_id=task_id)
                page_text = await self._search_tool.fetch_page(url, max_chars=3000)
                snippets.append(
                    f"### Source {i + 1}: {title}\nURL: {url}\n\n{page_text}"
                )
            else:
                snippets.append(f"### Source {i + 1}: {title}\n\n{snippet}")

        # ── Step 3: Summarise with LLM ────────────────────────────────
        self.set_state(AgentState.THINKING)
        self.send_message("Synthesising research findings with LLM…", task_id=task_id)

        combined_text = "\n\n---\n\n".join(snippets)
        prompt = (
            f"Research Goal: {goal}\n\n"
            f"Web Sources:\n\n{combined_text}\n\n"
            "Please synthesise the above sources into a comprehensive research summary."
        )

        try:
            summary = await llm_complete(
                prompt=prompt,
                system=_SUMMARIZE_SYSTEM,
                max_tokens=2048,
                temperature=0.3,
            )
        except Exception as exc:
            logger.error("LLM summarisation failed: %s", exc)
            summary = f"Raw search results (LLM unavailable):\n\n{combined_text[:4000]}"

        # ── Step 4: Store in vector memory ─────────────────────────────
        try:
            from app.memory.vector_store import get_vector_store

            vs = get_vector_store()
            await vs.add_memory(
                content=summary,
                metadata={"task_id": str(task_id or ""), "goal": goal[:200], "type": "research"},
                collection="research",
            )
            self.send_message("Findings stored in vector memory.", task_id=task_id)
        except Exception as exc:
            logger.warning("Failed to store research in vector memory: %s", exc)

        self.set_state(AgentState.DONE)
        self.send_message("Research complete.", task_id=task_id)
        return summary
