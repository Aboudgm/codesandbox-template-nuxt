"""
Pydantic models for Agent state and activity tracking.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentState(str, Enum):
    IDLE = "IDLE"
    THINKING = "THINKING"
    ACTING = "ACTING"
    WAITING = "WAITING"
    DONE = "DONE"
    ERROR = "ERROR"


class AgentInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # matches AgentType values
    state: AgentState = AgentState.IDLE
    current_task: Optional[str] = None
    messages_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ToolCall(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)
    result: Optional[Any] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class AgentActivity(BaseModel):
    agent_id: str
    action: str
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}
