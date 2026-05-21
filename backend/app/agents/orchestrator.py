"""
StrategistAgent (Boss tier) – top-level coordinator that plans and delegates.

Three-phase execution:
  Phase 1 (Strategy) : Deep analysis of goal → structured plan with agent assignments.
  Phase 2 (Execution): Delegate to sub-agents (worker tier).
  Phase 3 (Synthesis): Evaluate results, produce quality-checked final output.
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

# ---------------------------------------------------------------------------
# Strategist personality & system prompts
# ---------------------------------------------------------------------------

_STRATEGIST_PERSONA = (
    "You are NEXUS Strategist — a visionary executive AI. "
    "You see the big picture, think in systems, and set clear directives. "
    "Your tone: confident, precise, strategic. You speak like a brilliant CEO."
)

_PLAN_SYSTEM = (
    _STRATEGIST_PERSONA + "\n\n"
    "Given a high-level goal, produce an execution plan as a JSON object with this exact structure:\n\n"
    "{\n"
    '  "steps": [\n'
    '    {"agent": "memory",   "description": "..."},\n'
    '    {"agent": "research", "description": "..."},\n'
    '    {"agent": "code",     "description": "...", "language": "python"},\n'
    '    {"agent": "writer",   "description": "..."}\n'
    "  ],\n"
    '  "summary": "One-sentence strategic plan summary",\n'
    '  "priorities": ["priority 1", "priority 2"],\n'
    '  "expected_outputs": {"agent_name": "expected output description"}\n'
    "}\n\n"
    "Available agents: memory, research, code, writer.\n"
    "Include only agents genuinely needed for the goal.\n"
    "Return ONLY valid JSON — no other text."
)

_SYNTHESIS_SYSTEM = (
    _STRATEGIST_PERSONA + "\n\n"
    "You are synthesising the outputs of multiple specialist agents into a final, "
    "authoritative response. Your job:\n"
    "1. Evaluate the quality and completeness of each agent's output.\n"
    "2. Integrate insights coherently — no redundancy, no gaps.\n"
    "3. Produce a polished executive summary followed by detailed findings.\n"
    "4. Flag any gaps or quality concerns at the end under '## Quality Notes'.\n\n"
    "Format: clean Markdown, professional tone, actionable conclusions."
)


class OrchestratorAgent(BaseAgent):
    """
    Strategist (Boss-tier) agent.

    Breaks down a high-level goal into a strategic plan, dispatches each
    sub-agent in sequence, then synthesises a quality-checked final output.

    The class is named OrchestratorAgent for backward compatibility but
    operates as the STRATEGIST tier internally.
    """

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="StrategistAgent",
            agent_type=AgentType.STRATEGIST,
            ws_manager=ws_manager,
        )
        self._ws_manager = ws_manager

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)

        start_time = time.time()

        self.send_message(
            f"NEXUS Strategist engaged. Analyzing goal: {goal[:150]}",
            task_id=task_id,
            metadata={"tier": "boss", "personality": "Strategist"},
        )

        # ── Phase 1: Strategic planning ────────────────────────────────
        plan = await self._create_plan(goal, task_id)
        steps = plan.get("steps", [])
        plan_summary = plan.get("summary", "Executing multi-agent pipeline.")
        priorities = plan.get("priorities", [])

        priority_text = (
            "\nPriorities: " + ", ".join(priorities) if priorities else ""
        )
        self.send_message(
            f"Strategic plan locked.\n{plan_summary}{priority_text}\nSteps: {len(steps)}",
            task_id=task_id,
            metadata={
                "tier": "boss",
                "personality": "Strategist",
                "plan": plan,
            },
        )

        # ── Phase 2: Execute each step (delegation) ────────────────────
        accumulated_context: dict[str, Any] = {"goal": goal}
        results: dict[str, str] = {}

        for i, step in enumerate(steps):
            agent_name = step.get("agent", "").lower()
            description = step.get("description", "")

            self.send_message(
                f"[{i + 1}/{len(steps)}] Directing {agent_name}: {description[:100]}",
                task_id=task_id,
                metadata={"tier": "boss", "personality": "Strategist"},
            )

            agent_result = await self._dispatch(
                agent_name, task, accumulated_context, step
            )
            results[agent_name] = agent_result
            accumulated_context[agent_name] = agent_result

            excerpt = agent_result[:200] + ("…" if len(agent_result) > 200 else "")
            self.send_message(
                f"{agent_name} delivered.\n{excerpt}",
                task_id=task_id,
                metadata={"tier": "boss", "personality": "Strategist"},
            )

        # ── Phase 3: Synthesis & quality check ────────────────────────
        self.set_state(AgentState.THINKING)
        self.send_message(
            "Synthesising all agent outputs. Running quality check…",
            task_id=task_id,
            metadata={"tier": "boss", "personality": "Strategist"},
        )

        final_result = await self._synthesise(goal, results, task_id)

        duration = time.time() - start_time

        # ── Save to episodic memory ────────────────────────────────────
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
            f"Mission complete. Total time: {duration:.1f}s.",
            task_id=task_id,
            metadata={
                "tier": "boss",
                "personality": "Strategist",
                "duration": duration,
            },
        )

        return final_result

    # ------------------------------------------------------------------
    # Phase 1 helpers
    # ------------------------------------------------------------------

    async def _create_plan(self, goal: str, task_id: Optional[str]) -> dict:
        self.send_message(
            "Formulating strategic execution plan…",
            task_id=task_id,
            metadata={"tier": "boss", "personality": "Strategist"},
        )
        prompt = f"Goal: {goal}\n\nCreate a strategic execution plan as JSON."
        try:
            raw = await llm_complete(
                prompt=prompt,
                system=_PLAN_SYSTEM,
                max_tokens=1024,
                temperature=0.2,
                fast=True,  # planning uses fast model to keep latency low
            )
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
                {
                    "agent": "code",
                    "description": f"Implement code for: {goal[:80]}",
                    "language": "python",
                }
            )
        steps.append({"agent": "writer", "description": "Write final report"})
        return {
            "steps": steps,
            "summary": f"Default pipeline for: {goal[:60]}",
            "priorities": ["accuracy", "completeness"],
            "expected_outputs": {
                "memory": "Relevant past context",
                "research": "Comprehensive research summary",
                "writer": "Final polished report",
            },
        }

    # ------------------------------------------------------------------
    # Phase 3 helpers
    # ------------------------------------------------------------------

    async def _synthesise(
        self, goal: str, results: dict[str, str], task_id: Optional[str]
    ) -> str:
        """Use the LLM strategist to synthesise all agent results."""
        # If writer already produced output, prefer it as the base
        if "writer" in results and results["writer"]:
            writer_out = results["writer"]
            # If we have other results, still pass through quality synthesis
            if len(results) == 1:
                return writer_out

        # Build synthesis prompt
        parts = [f"## Original Goal\n{goal}\n"]
        for agent_name, result in results.items():
            parts.append(f"## {agent_name.capitalize()} Agent Output\n{result[:2000]}")
        parts.append(
            "\nSynthesise the above into a final, comprehensive, quality-checked response."
        )
        prompt = "\n\n".join(parts)

        try:
            return await llm_complete(
                prompt=prompt,
                system=_SYNTHESIS_SYSTEM,
                max_tokens=4096,
                temperature=0.3,
            )
        except Exception as exc:
            logger.warning("Synthesis LLM call failed (%s). Falling back to aggregation.", exc)
            return self._aggregate(goal, results)

    @staticmethod
    def _aggregate(goal: str, results: dict[str, str]) -> str:
        parts = [f"# Result for: {goal}\n"]
        for name, result in results.items():
            parts.append(f"## {name.capitalize()} Agent\n{result[:1500]}")
        return "\n\n".join(parts)

    # ------------------------------------------------------------------
    # Phase 2: Agent dispatch
    # ------------------------------------------------------------------

    async def _dispatch(
        self,
        agent_name: str,
        task: Any,
        context: dict[str, Any],
        step: dict,
    ) -> str:
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
