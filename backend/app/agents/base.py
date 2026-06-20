"""Abstract base agent — NEXUS AI v2.0 with full streaming support."""
from __future__ import annotations

import asyncio
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from rich.console import Console
from rich.text import Text

from app.models.agent import AgentActivity, AgentInfo, AgentState
from app.models.task import AgentMessage, AgentType

if TYPE_CHECKING:
    from app.api.websocket import ConnectionManager
    from app.models.event import StreamEventType

logger = logging.getLogger(__name__)
_console = Console()


class BaseAgent(ABC):
    """
    Abstract base agent with async streaming.

    Every agent can emit structured StreamEvents (thinking, tool_call,
    tool_result, output) that flow to SSE clients and WebSocket connections
    simultaneously.
    """

    def __init__(
        self,
        name: str,
        agent_type: AgentType,
        ws_manager: Optional["ConnectionManager"] = None,
    ):
        self.id:            str = str(uuid.uuid4())
        self.name:          str = name
        self.agent_type:    AgentType = agent_type
        self.state:         AgentState = AgentState.IDLE
        self.message_history: list[AgentMessage] = []
        self.activity_log:  list[AgentActivity] = []
        self._ws_manager:   Optional["ConnectionManager"] = ws_manager
        self._current_task_id: Optional[str] = None
        self.created_at:    datetime = datetime.utcnow()

    # ── Abstract interface ─────────────────────────────────────────────────────

    @abstractmethod
    async def run(self, task: Any, context: dict[str, Any]) -> str:
        """Execute the agent's workload and return a result string."""

    # ── State management ───────────────────────────────────────────────────────

    def set_state(self, state: AgentState) -> None:
        self.state = state
        self._log_activity("state_change", {"state": state.value})

    def set_task(self, task_id: Optional[str]) -> None:
        self._current_task_id = task_id

    # ── Core async streaming ───────────────────────────────────────────────────

    async def emit(
        self,
        event_type: "StreamEventType",
        content: str,
        metadata: Optional[dict] = None,
        task_id: Optional[str] = None,
    ) -> None:
        """Emit a StreamEvent to SSE queues + WebSocket connections."""
        from app.models.event import StreamEvent

        tid = task_id or self._current_task_id or ""
        if not tid or not self._ws_manager:
            return

        event = StreamEvent(
            type=event_type,
            task_id=tid,
            agent_id=self.id,
            agent_name=self.name,
            agent_type=self.agent_type.value,
            content=content,
            metadata=metadata or {},
        )
        await self._ws_manager.emit(tid, event)

    # ── Semantic helper emitters ───────────────────────────────────────────────

    async def think(self, thought: str, task_id: Optional[str] = None) -> None:
        from app.models.event import StreamEventType
        self.log(f"[thinking] {thought[:80]}")
        await self.emit(StreamEventType.THINKING, thought, task_id=task_id)

    async def use_tool(
        self, tool: str, args: dict, task_id: Optional[str] = None
    ) -> None:
        import json as _json
        from app.models.event import StreamEventType
        content = _json.dumps(args, ensure_ascii=False)[:400]
        self.log(f"[tool:{tool}] {content[:60]}")
        await self.emit(
            StreamEventType.TOOL_CALL, content, {"tool": tool, "args": args}, task_id=task_id
        )

    async def tool_result(
        self, tool: str, result: str, task_id: Optional[str] = None
    ) -> None:
        from app.models.event import StreamEventType
        await self.emit(
            StreamEventType.TOOL_RESULT,
            result[:1000],
            {"tool": tool},
            task_id=task_id,
        )

    async def output(self, text: str, task_id: Optional[str] = None) -> None:
        from app.models.event import StreamEventType
        msg = AgentMessage(agent_type=self.agent_type, content=text, metadata={})
        self.message_history.append(msg)
        self.log(f"[output] {text[:80]}")
        await self.emit(StreamEventType.OUTPUT, text, task_id=task_id)

    async def status(self, text: str, task_id: Optional[str] = None) -> None:
        from app.models.event import StreamEventType
        await self.emit(StreamEventType.STATUS, text, task_id=task_id)

    # ── Legacy sync send_message (backward-compat, fire-and-forget) ───────────

    def send_message(
        self,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
        task_id: Optional[str] = None,
    ) -> AgentMessage:
        from app.models.event import StreamEvent, StreamEventType

        msg = AgentMessage(
            agent_type=self.agent_type,
            content=content,
            metadata=metadata or {},
        )
        self.message_history.append(msg)

        tid = task_id or self._current_task_id
        if tid and self._ws_manager is not None:
            event = StreamEvent(
                type=StreamEventType.OUTPUT,
                task_id=tid,
                agent_id=self.id,
                agent_name=self.name,
                agent_type=self.agent_type.value,
                content=content,
                metadata=metadata or {},
            )
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._ws_manager.emit(tid, event))
            except RuntimeError:
                pass

        self.log(f"[{self.name}] {content}")
        return msg

    # ── Activity logging ───────────────────────────────────────────────────────

    def _log_activity(self, action: str, details: dict[str, Any]) -> None:
        self.activity_log.append(
            AgentActivity(agent_id=self.id, action=action, details=details)
        )

    # ── Console logging ────────────────────────────────────────────────────────

    def log(self, message: str, level: str = "info") -> None:
        color = {"info": "cyan", "success": "green", "warning": "yellow", "error": "red"}.get(level, "white")
        try:
            _console.print(
                Text(f"[{self.name}] ", style=f"bold {color}") + Text(message)
            )
        except Exception:
            pass
        getattr(logger, level if level in ("info", "warning", "error") else "info")(
            "[%s] %s", self.name, message
        )

    # ── Serialization ──────────────────────────────────────────────────────────

    def to_info(self) -> AgentInfo:
        return AgentInfo(
            id=self.id,
            name=self.name,
            type=self.agent_type.value,
            state=self.state,
            current_task=self._current_task_id,
            messages_count=len(self.message_history),
            created_at=self.created_at,
        )
