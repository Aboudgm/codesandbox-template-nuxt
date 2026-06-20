"""
Pydantic models for Tasks and Agent Messages.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentType(str, Enum):
    ORCHESTRATOR = "ORCHESTRATOR"
    RESEARCHER = "RESEARCHER"
    CODER = "CODER"
    WRITER = "WRITER"
    MEMORY = "MEMORY"
    # Tier-aware types
    STRATEGIST = "STRATEGIST"
    TECH_LEAD = "TECH_LEAD"
    RESEARCH_MANAGER = "RESEARCH_MANAGER"
    CONTENT_DIRECTOR = "CONTENT_DIRECTOR"


class AgentMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)
    tier: Optional[str] = None  # "boss" | "manager" | "worker"

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal: str
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: list[AgentMessage] = Field(default_factory=list)
    result: Optional[str] = None
    agents: list[str] = Field(default_factory=list)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}

    def add_message(self, message: AgentMessage) -> None:
        self.messages.append(message)
        self.updated_at = datetime.utcnow()

    def update_status(self, status: TaskStatus) -> None:
        self.status = status
        self.updated_at = datetime.utcnow()


class TaskCreate(BaseModel):
    goal: str = Field(..., min_length=1, max_length=4096)


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    result: Optional[str] = None
