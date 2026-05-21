"""
OrchestratorAgent – top-level coordinator that plans and delegates to sub-agents.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional, TYPE_CHECKING

from app.agents.base import BaseAgent
from app.agents.llm_client import llm_complete
from app.models.agent import AgentState
from app.models.task import AgentType, TaskStatus

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager

logger = logging.getLogger(__name__)

_PLAN_SYSTEM = """You are an orchestration AI. Given a high-level goal, produce an
execution plan as a JSON object with this exact structure:

{
  "steps": [
    {"agent": "memory",   "description": "..."},
    {"agent": "research", "description": "..."},
    {"agent": "code",     "description": "...", "language": "python"},
    {"agent": "writer",   "description": "..."}
  ],
  "summary": "One-sentence plan summary"
}

Available agents: memory, research, code, writer.
Include only the agents genuinely needed for the goal.
Return ONLY valid JSON – no other text."""


class OrchestratorAgent(BaseAgent):
    """
    Breaks down a high-level goal into a step-by-step plan, dispatches each
    sub-agent in sequence, and produces a final aggregated result.
    """

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="OrchestratorAgent",
            agent_type=AgentType.ORCHESTRATOR,
            ws_manager=ws_manager,
        )
        self._ws_manager = ws_manager

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        from app.api.routes.tasks import _task_registry  # avoid circular at module level

        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)

        start_time = time.time()

        self.send_message(f"Orchestrating task: {goal[:150]}", task_id=task_id)

        # ── Step 1: Generate execution plan ───────────────────────────
        plan = await self._create_plan(goal, task_id)
        steps = plan.get("steps", [])
        plan_summary = plan.get("summary", "Executing multi-agent pipeline.")

        self.send_message(
            f"Execution plan: {plan_summary}\nSteps: {len(steps)}",
            task_id=task_id,
            metadata={"plan": plan},
        )

        # ── Step 2: Execute each step ──────────────────────────────────
        accumulated_context: dict[str, Any] = {"goal": goal}
        results: dict[str, str] = {}

        for i, step in enumerate(steps):
            agent_name = step.get("agent", "").lower()
            description = step.get("description", "")

            self.send_message(
                f"[{i + 1}/{len(steps)}] Delegating to {agent_name}: {description[:100]}",
                task_id=task_id,
            )

            agent_result = await self._dispatch(
                agent_name, task, accumulated_context, step
            )
            results[agent_name] = agent_result
            accumulated_context[agent_name] = agent_result

            # Relay short excerpt to task messages
            excerpt = agent_result[:200] + ("…" if len(agent_result) > 200 else "")
            self.send_message(
                f"{agent_name} completed.\n{excerpt}",
                task_id=task_id,
            )

        # ── Step 3: Aggregate final result ─────────────────────────────
        self.set_state(AgentState.THINKING)
        final_result = results.get("writer") or self._aggregate(goal, results)

        duration = time.time() - start_time

        # ── Step 4: Save to episodic memory ───────────────────────────
        try:
            from app.memory.episodic import get_episodic_memory

            em = get_episodic_memory()
            await em.save_task(
                task_id=str(task_id or ""),
                goal=goal,
                summary=plan_summary,
                result=final_result[:2000],
                duration=duration,
                success=True,
            )
        except Exception as exc:
            logger.warning("Failed to save to episodic memory: %s", exc)

        self.set_state(AgentState.DONE)
        self.send_message(
            f"Task completed in {duration:.1f}s.",
            task_id=task_id,
            metadata={"duration": duration},
        )

        return final_result

    # ------------------------------------------------------------------
    # Plan creation
    # ------------------------------------------------------------------

    async def _create_plan(self, goal: str, task_id: Optional[str]) -> dict:
        self.send_message("Creating execution plan…", task_id=task_id)
        prompt = f"Goal: {goal}\n\nCreate an execution plan as JSON."
        try:
            raw = await llm_complete(
                prompt=prompt,
                system=_PLAN_SYSTEM,
                max_tokens=1024,
                temperature=0.2,
            )
            # Strip markdown fences if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            plan = json.loads(raw)
        except Exception as exc:
            logger.warning("Plan generation failed (%s). Using default plan.", exc)
            plan = self._default_plan(goal)

        return plan

    @staticmethod
    def _default_plan(goal: str) -> dict:
        """Fallback plan when LLM is unavailable."""
        needs_code = any(
            kw in goal.lower()
            for kw in ("code", "script", "program", "function", "implement", "write a")
        )
        steps = [
            {"agent": "memory", "description": "Retrieve relevant past context"},
            {"agent": "research", "description": f"Research: {goal[:80]}"},
        ]
        if needs_code:
            steps.append(
                {"agent": "code", "description": f"Implement code for: {goal[:80]}", "language": "python"}
            )
        steps.append({"agent": "writer", "description": "Write final report"})
        return {"steps": steps, "summary": f"Default pipeline for: {goal[:60]}"}

    # ------------------------------------------------------------------
    # Agent dispatch
    # ------------------------------------------------------------------

    async def _dispatch(
        self,
        agent_name: str,
        task: Any,
        context: dict[str, Any],
        step: dict,
    ) -> str:
        """Instantiate the requested sub-agent and run it."""
        agent_map = {
            "memory": self._run_memory,
            "research": self._run_research,
            "code": self._run_code,
            "writer": self._run_writer,
        }
        runner = agent_map.get(agent_name)
        if runner is None:
            logger.warning("Unknown agent: %s – skipping", agent_name)
            return f"(Agent '{agent_name}' not found)"
        try:
            return await runner(task, context, step)
        except Exception as exc:
            logger.error("Agent %s failed: %s", agent_name, exc)
            return f"(Agent '{agent_name}' encountered an error: {exc})"

    async def _run_memory(self, task: Any, context: dict, step: dict) -> str:
        from app.agents.memory_agent import MemoryAgent
        agent = MemoryAgent(ws_manager=self._ws_manager)
        return await agent.run(task, context)

    async def _run_research(self, task: Any, context: dict, step: dict) -> str:
        from app.agents.research_agent import ResearchAgent
        agent = ResearchAgent(ws_manager=self._ws_manager)
        return await agent.run(task, context)

    async def _run_code(self, task: Any, context: dict, step: dict) -> str:
        from app.agents.code_agent import CodeAgent
        ctx = {**context, "language": step.get("language", "python")}
        # Expose research findings as 'research' context key
        if "research" not in ctx and "research" in context:
            ctx["research"] = context["research"]
        agent = CodeAgent(ws_manager=self._ws_manager)
        return await agent.run(task, ctx)

    async def _run_writer(self, task: Any, context: dict, step: dict) -> str:
        from app.agents.writer_agent import WriterAgent
        ctx = {
            "research": context.get("research", ""),
            "code_result": context.get("code", ""),
            "memory": context.get("memory", ""),
        }
        agent = WriterAgent(ws_manager=self._ws_manager)
        return await agent.run(task, ctx)

    # ------------------------------------------------------------------
    # Aggregation fallback
    # ------------------------------------------------------------------

    @staticmethod
    def _aggregate(goal: str, results: dict[str, str]) -> str:
        parts = [f"# Result for: {goal}\n"]
        for name, result in results.items():
            parts.append(f"## {name.capitalize()} Agent\n{result[:1500]}")
        return "\n\n".join(parts)
