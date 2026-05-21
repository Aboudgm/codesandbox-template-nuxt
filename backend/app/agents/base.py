"""
Abstract base class for all agents in the multi-agent framework.
"""
from __future__ import annotations

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

logger = logging.getLogger(__name__)
_console = Console()


class BaseAgent(ABC):
    """
    Abstract base agent.

    Sub-classes must implement: async run(task, context) -> str
    """

    def __init__(
        self,
        name: str,
        agent_type: AgentType,
        ws_manager: Optional["ConnectionManager"] = None,
    ):
        self.id: str = str(uuid.uuid4())
        self.name: str = name
        self.agent_type: AgentType = agent_type
        self.state: AgentState = AgentState.IDLE
        self.message_history: list[AgentMessage] = []
        self.activity_log: list[AgentActivity] = []
        self._ws_manager: Optional["ConnectionManager"] = ws_manager
        self._current_task_id: Optional[str] = None
        self.created_at: datetime = datetime.utcnow()

    # ------------------------------------------------------------------
    # Abstract interface
    # ------------------------------------------------------------------

    @abstractmethod
    async def run(self, task: Any, context: dict[str, Any]) -> str:
        """Execute the agent's primary workload and return a result string."""

    # ------------------------------------------------------------------
    # State management
    # ------------------------------------------------------------------

    def set_state(self, state: AgentState) -> None:
        self.state = state
        self._log_activity("state_change", {"state": state.value})

    def set_task(self, task_id: Optional[str]) -> None:
        self._current_task_id = task_id

    # ------------------------------------------------------------------
    # Messaging / WebSocket
    # ------------------------------------------------------------------

    def send_message(
        self,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
        task_id: Optional[str] = None,
    ) -> AgentMessage:
        """
        Create an AgentMessage, append it to history, and broadcast via WebSocket.
        Returns the created message.
        """
        msg = AgentMessage(
            agent_type=self.agent_type,
            content=content,
            metadata=metadata or {},
        )
        self.message_history.append(msg)

        # Broadcast to WebSocket clients if manager is available
        tid = task_id or self._current_task_id
        if tid and self._ws_manager is not None:
            import asyncio

            payload = {
                "type": "agent_message",
                "task_id": tid,
                "agent_id": self.id,
                "agent_name": self.name,
                "agent_type": self.agent_type.value,
                "message": msg.model_dump(mode="json"),
            }
            # Fire-and-forget: schedule broadcast without awaiting
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._ws_manager.broadcast(tid, payload))
            except RuntimeError:
                pass  # No running event loop – skip broadcast

        self.log(f"[{self.name}] {content}")
        return msg

    # ------------------------------------------------------------------
    # Activity logging
    # ------------------------------------------------------------------

    def _log_activity(self, action: str, details: dict[str, Any]) -> None:
        activity = AgentActivity(
            agent_id=self.id,
            action=action,
            details=details,
        )
        self.activity_log.append(activity)

    # ------------------------------------------------------------------
    # Logging / Console
    # ------------------------------------------------------------------

    def log(self, message: str, level: str = "info") -> None:
        """Log a message with rich formatting."""
        color_map = {
            "info": "cyan",
            "success": "green",
            "warning": "yellow",
            "error": "red",
        }
        color = color_map.get(level, "white")
        try:
            _console.print(
                Text(f"[{self.name}] ", style=f"bold {color}") + Text(message)
            )
        except Exception:
            pass
        getattr(logger, level if level in ("info", "warning", "error") else "info")(
            "[%s] %s", self.name, message
        )

    # ------------------------------------------------------------------
    # Serialization helpers
    # ------------------------------------------------------------------

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
