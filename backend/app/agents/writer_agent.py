"""
WriterAgent – synthesises research results and code output into a polished report.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional, TYPE_CHECKING

from app.agents.base import BaseAgent
from app.agents.llm_client import llm_complete
from app.models.agent import AgentState
from app.models.task import AgentType
from app.tools.file_manager import get_file_manager

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager

logger = logging.getLogger(__name__)

_WRITER_SYSTEM = (
    "You are an expert technical writer. Your job is to synthesise research findings "
    "and code results into a comprehensive, well-structured Markdown document. "
    "The document should be clear, informative, and professional. "
    "Use headings, bullet points, and code blocks where appropriate."
)


class WriterAgent(BaseAgent):
    """
    Takes the combined context (goal, research, code results) and produces
    a polished Markdown report saved to /data/workspace/reports/.
    """

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="WriterAgent",
            agent_type=AgentType.WRITER,
            ws_manager=ws_manager,
        )

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)

        self.send_message(f"Writing final report for: {goal[:120]}", task_id=task_id)

        research = context.get("research", "")
        code_result = context.get("code_result", "")
        memory_context = context.get("memory", "")

        # ── Build the synthesis prompt ─────────────────────────────────
        prompt_parts = [f"## Task Goal\n{goal}\n"]

        if memory_context:
            prompt_parts.append(f"## Relevant Past Experience\n{memory_context[:800]}")

        if research:
            prompt_parts.append(f"## Research Findings\n{research[:3000]}")

        if code_result:
            prompt_parts.append(f"## Code Execution Results\n{code_result[:2000]}")

        prompt_parts.append(
            "Based on all of the above information, write a comprehensive final report "
            "that addresses the original task goal. Structure it with clear sections, "
            "key findings, and actionable conclusions."
        )

        prompt = "\n\n".join(prompt_parts)

        # ── Call LLM ───────────────────────────────────────────────────
        self.set_state(AgentState.ACTING)
        self.send_message("Generating report with LLM…", task_id=task_id)

        try:
            report = await llm_complete(
                prompt=prompt,
                system=_WRITER_SYSTEM,
                max_tokens=4096,
                temperature=0.4,
            )
        except Exception as exc:
            logger.error("WriterAgent LLM call failed: %s", exc)
            report = self._fallback_report(goal, research, code_result)

        # ── Add document header ────────────────────────────────────────
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        header = (
            f"# Report: {goal[:80]}\n"
            f"*Generated: {timestamp}*\n\n---\n\n"
        )
        full_report = header + report

        # ── Save to workspace ──────────────────────────────────────────
        safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in goal[:40])
        filename = f"reports/report_{safe_name}_{task_id or 'task'}.md"
        try:
            fm = get_file_manager()
            await fm.create_file(filename, full_report)
            self.send_message(f"Report saved to {filename}", task_id=task_id)
        except Exception as exc:
            logger.warning("Could not save report: %s", exc)

        self.set_state(AgentState.DONE)
        self.send_message("Report writing complete.", task_id=task_id)
        return full_report

    # ------------------------------------------------------------------

    @staticmethod
    def _fallback_report(goal: str, research: str, code_result: str) -> str:
        """Minimal report when LLM is unavailable."""
        parts = [f"## Goal\n{goal}\n"]
        if research:
            parts.append(f"## Research Summary\n{research[:2000]}")
        if code_result:
            parts.append(f"## Code Results\n{code_result[:1000]}")
        if not research and not code_result:
            parts.append("No additional information was gathered.")
        return "\n\n".join(parts)
