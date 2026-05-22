"""Stream event model — NEXUS AI v2.0 real-time agent communication."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class StreamEventType(str, Enum):
    THINKING    = "thinking"      # Agent reasoning / internal monologue
    TOOL_CALL   = "tool_call"     # Agent invoking a tool
    TOOL_RESULT = "tool_result"   # Tool returned output
    OUTPUT      = "output"        # Agent's message / final output
    AGENT_START = "agent_start"   # Sub-agent began working
    AGENT_DONE  = "agent_done"    # Sub-agent finished
    TASK_STARTED= "task_started"  # Task started executing
    TASK_DONE   = "task_done"     # Task finished (success/fail)
    PLAN        = "plan"          # Orchestrator emitted a structured plan
    ERROR       = "error"         # Error occurred
    STATUS      = "status"        # Generic status update


class StreamEvent(BaseModel):
    id:         str = Field(default_factory=lambda: str(uuid.uuid4()))
    type:       StreamEventType
    task_id:    str
    agent_id:   str
    agent_name: str
    agent_type: str
    content:    str
    metadata:   dict[str, Any] = Field(default_factory=dict)
    timestamp:  datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}
