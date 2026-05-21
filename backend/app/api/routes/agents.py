"""Agent status API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.agent import AgentInfo, AgentActivity

router = APIRouter(prefix="/api/agents", tags=["agents"])

# Registry populated by agent instances at runtime
_agents: dict[str, "BaseAgent"] = {}  # type: ignore[name-defined]


def register_agent(agent: "BaseAgent") -> None:  # type: ignore[name-defined]
    _agents[agent.id] = agent


def unregister_agent(agent_id: str) -> None:
    _agents.pop(agent_id, None)


@router.get("", response_model=list[AgentInfo])
async def list_agents() -> list[AgentInfo]:
    return [a.to_info() for a in _agents.values()]


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str) -> AgentInfo:
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(404, detail="Agent not found")
    return agent.to_info()


@router.get("/{agent_id}/messages")
async def get_agent_messages(agent_id: str) -> list[dict]:
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(404, detail="Agent not found")
    return [m.model_dump(mode="json") for m in agent.message_history]


@router.get("/{agent_id}/activity", response_model=list[AgentActivity])
async def get_agent_activity(agent_id: str) -> list[AgentActivity]:
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(404, detail="Agent not found")
    return agent.activity_log
