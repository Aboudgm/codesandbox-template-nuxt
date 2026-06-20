"""
NEXUS Strategist — Boss-tier orchestrator with full streaming (v2.0).

Three-phase execution:
  Phase 1 (Strategy) : Deep analysis → JSON plan emitted as a PLAN event.
  Phase 2 (Execution): Delegate to sub-agents, streaming their progress.
  Phase 3 (Synthesis): Quality-checked final synthesis streamed as OUTPUT.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional, TYPE_CHECKING

from app.agents.base import BaseAgent
from app.agents.llm_client import llm_complete
from app.models.agent import AgentState
from app.models.event import StreamEventType
from app.models.task import AgentType, TaskStatus

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager

logger = logging.getLogger(__name__)

_PERSONA = (
    "You are NEXUS — an elite autonomous AI orchestrator. "
    "You think in systems, speak precisely, and command with confidence. "
    "Your decisions are data-driven, your strategy is always multi-dimensional."
)

_PLAN_SYSTEM = (
    _PERSONA + "\n\n"
    "Analyze the user's goal and create a precise execution plan as JSON:\n\n"
    "{\n"
    '  "steps": [\n'
    '    {"agent": "memory",   "description": "..."},\n'
    '    {"agent": "research", "description": "..."},\n'
    '    {"agent": "code",     "description": "...", "language": "python"},\n'
    '    {"agent": "writer",   "description": "..."}\n'
    "  ],\n"
    '  "summary": "One-sentence strategic summary",\n'
    '  "priorities": ["p1", "p2"],\n'
    '  "complexity": "low|medium|high"\n'
    "}\n\n"
    "Available agents: memory, research, code, writer.\n"
    "Only include agents genuinely needed. For simple goals, use 1-2 agents.\n"
    "Return ONLY valid JSON — no markdown, no extra text."
)

_SYNTHESIS_SYSTEM = (
    _PERSONA + "\n\n"
    "Synthesize multiple agent outputs into a final authoritative response.\n"
    "1. Integrate insights coherently — no redundancy, no gaps.\n"
    "2. Produce a polished executive summary + detailed findings.\n"
    "3. Note any gaps under '## Gaps & Limitations' if applicable.\n"
    "Format: clean Markdown, professional tone, actionable conclusions.\n"
    "Be comprehensive but focused on what the user actually asked for."
)


class OrchestratorAgent(BaseAgent):
    """NEXUS Strategist — orchestrates the multi-agent pipeline with streaming."""

    def __init__(self, ws_manager: Optional["ConnectionManager"] = None):
        super().__init__(
            name="NEXUS",
            agent_type=AgentType.STRATEGIST,
            ws_manager=ws_manager,
        )

    async def run(self, task: Any, context: dict[str, Any]) -> str:
        self.set_state(AgentState.THINKING)
        goal: str = getattr(task, "goal", str(task))
        task_id: Optional[str] = getattr(task, "id", None)
        self.set_task(task_id)
        start = time.time()

        # ── Announce ──────────────────────────────────────────────────────────
        await self.emit(StreamEventType.AGENT_START, f"NEXUS Strategist online", task_id=task_id)
        await self.think(
            f"Analyzing goal: '{goal[:120]}' — determining optimal agent configuration…",
            task_id=task_id,
        )

        # ── Phase 1: Plan ─────────────────────────────────────────────────────
        plan = await self._create_plan(goal, task_id)
        steps = plan.get("steps", [])
        summary = plan.get("summary", "Executing multi-agent pipeline.")
        complexity = plan.get("complexity", "medium")
        priorities = plan.get("priorities", [])

        # Emit the plan as a PLAN event so the frontend can render it specially
        await self.emit(
            StreamEventType.PLAN,
            json.dumps(plan),
            {"steps": steps, "summary": summary, "complexity": complexity},
            task_id=task_id,
        )
        await self.output(
            f"**Strategic Plan:** {summary}\n"
            f"Complexity: **{complexity}** | Steps: **{len(steps)}**"
            + (f"\nPriorities: {', '.join(priorities)}" if priorities else ""),
            task_id=task_id,
        )

        # ── Phase 2: Execute ──────────────────────────────────────────────────
        self.set_state(AgentState.ACTING)
        accumulated: dict[str, Any] = {"goal": goal}
        results: dict[str, str] = {}

        for i, step in enumerate(steps, 1):
            agent_key = step.get("agent", "").lower()
            description = step.get("description", "")

            await self.think(
                f"Step {i}/{len(steps)}: Dispatching **{agent_key.upper()}** — {description[:120]}",
                task_id=task_id,
            )

            agent_result = await self._dispatch(agent_key, task, accumulated, step)
            results[agent_key] = agent_result
            accumulated[agent_key] = agent_result

            excerpt = (agent_result[:180] + "…") if len(agent_result) > 180 else agent_result
            await self.status(
                f"✓ {agent_key.upper()} delivered ({len(agent_result)} chars)",
                task_id=task_id,
            )

        # ── Phase 3: Synthesize ───────────────────────────────────────────────
        self.set_state(AgentState.THINKING)
        await self.think(
            f"All {len(results)} agent(s) reported. Running quality synthesis…",
            task_id=task_id,
        )

        final = await self._synthesise(goal, results, task_id)
        duration = time.time() - start

        # Save to episodic memory (best-effort)
        try:
            from app.memory.episodic import get_episodic_memory
            await get_episodic_memory().save_task(
                task_id=str(task_id or ""),
                goal=goal,
                summary=summary,
                result=final[:2000],
                duration=duration,
                success=True,
            )
        except Exception as exc:
            logger.warning("Episodic memory save failed: %s", exc)

        self.set_state(AgentState.DONE)
        await self.emit(
            StreamEventType.AGENT_DONE,
            f"NEXUS complete — {duration:.1f}s",
            {"duration": duration, "agents_used": list(results.keys())},
            task_id=task_id,
        )

        return final

    # ── Phase 1: Plan creation ─────────────────────────────────────────────────

    async def _create_plan(self, goal: str, task_id: Optional[str]) -> dict:
        await self.think("Formulating strategic execution plan…", task_id=task_id)
        await self.use_tool(
            "plan_generator",
            {"goal": goal[:200], "available_agents": ["memory", "research", "code", "writer"]},
            task_id=task_id,
        )
        try:
            raw = await llm_complete(
                prompt=f"Goal: {goal}\n\nCreate execution plan as JSON.",
                system=_PLAN_SYSTEM,
                max_tokens=1024,
                temperature=0.15,
                fast=True,
            )
            raw = raw.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
            if raw.endswith("```"):
                raw = raw[: raw.rfind("```")]
            plan = json.loads(raw)
        except Exception as exc:
            logger.warning("Plan generation failed (%s). Using default plan.", exc)
            plan = self._default_plan(goal)

        await self.tool_result("plan_generator", json.dumps(plan)[:300], task_id=task_id)
        return plan

    @staticmethod
    def _default_plan(goal: str) -> dict:
        needs_code = any(
            kw in goal.lower()
            for kw in ("code", "script", "program", "function", "implement", "build", "create a")
        )
        steps = [
            {"agent": "memory",   "description": "Retrieve relevant prior knowledge"},
            {"agent": "research", "description": f"Research: {goal[:80]}"},
        ]
        if needs_code:
            steps.append({"agent": "code", "description": f"Implement: {goal[:80]}", "language": "python"})
        steps.append({"agent": "writer", "description": "Synthesize findings into final report"})
        return {
            "steps": steps,
            "summary": f"Default multi-agent pipeline for: {goal[:60]}",
            "priorities": ["accuracy", "completeness"],
            "complexity": "medium",
        }

    # ── Phase 3: Synthesis ─────────────────────────────────────────────────────

    async def _synthesise(self, goal: str, results: dict[str, str], task_id: Optional[str]) -> str:
        if "writer" in results and len(results) == 1:
            return results["writer"]

        await self.use_tool(
            "synthesizer",
            {"agents": list(results.keys()), "goal": goal[:100]},
            task_id=task_id,
        )

        parts = [f"## Original Goal\n{goal}\n"]
        for name, result in results.items():
            parts.append(f"## {name.capitalize()} Agent Output\n{result[:2500]}")
        parts.append("\nSynthesize the above into a final, comprehensive, quality-checked response.")
        prompt = "\n\n".join(parts)

        try:
            result = await llm_complete(
                prompt=prompt, system=_SYNTHESIS_SYSTEM, max_tokens=4096, temperature=0.3
            )
            await self.tool_result("synthesizer", f"Synthesis complete ({len(result)} chars)", task_id=task_id)
            return result
        except Exception as exc:
            logger.warning("Synthesis failed (%s). Falling back to aggregation.", exc)
            return self._aggregate(goal, results)

    @staticmethod
    def _aggregate(goal: str, results: dict[str, str]) -> str:
        parts = [f"# Result for: {goal}\n"]
        for name, result in results.items():
            parts.append(f"## {name.capitalize()} Agent\n{result[:2000]}")
        return "\n\n".join(parts)

    # ── Dispatch ───────────────────────────────────────────────────────────────

    async def _dispatch(self, agent_name: str, task: Any, context: dict, step: dict) -> str:
        runners = {
            "memory":   self._run_memory,
            "research": self._run_research,
            "code":     self._run_code,
            "writer":   self._run_writer,
        }
        runner = runners.get(agent_name)
        if runner is None:
            logger.warning("Unknown agent '%s' — skipping", agent_name)
            return f"(Agent '{agent_name}' not available)"
        try:
            return await runner(task, context, step)
        except Exception as exc:
            logger.error("Agent %s failed: %s", agent_name, exc)
            return f"(Agent '{agent_name}' encountered an error: {exc})"

    async def _run_memory(self, task, context, step):
        from app.agents.memory_agent import MemoryAgent
        return await MemoryAgent(ws_manager=self._ws_manager).run(task, context)

    async def _run_research(self, task, context, step):
        from app.agents.research_agent import ResearchAgent
        return await ResearchAgent(ws_manager=self._ws_manager).run(task, context)

    async def _run_code(self, task, context, step):
        from app.agents.code_agent import CodeAgent
        ctx = {**context, "language": step.get("language", "python")}
        return await CodeAgent(ws_manager=self._ws_manager).run(task, ctx)

    async def _run_writer(self, task, context, step):
        from app.agents.writer_agent import WriterAgent
        ctx = {
            "research":    context.get("research", ""),
            "code_result": context.get("code", ""),
            "memory":      context.get("memory", ""),
        }
        return await WriterAgent(ws_manager=self._ws_manager).run(task, ctx)
