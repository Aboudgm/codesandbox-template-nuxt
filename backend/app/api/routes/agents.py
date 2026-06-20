"""Agent status API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.agent import AgentInfo, AgentActivity, AgentState

router = APIRouter(prefix="/api/agents", tags=["agents"])

# Runtime registry — populated by live agent instances
_agents: dict[str, "BaseAgent"] = {}  # type: ignore[name-defined]


def register_agent(agent: "BaseAgent") -> None:  # type: ignore[name-defined]
    _agents[agent.id] = agent


def unregister_agent(agent_id: str) -> None:
    _agents.pop(agent_id, None)


# Static roster — always visible even when no tasks are running
_ROSTER: list[AgentInfo] = [
    AgentInfo(id="strategist-1", name="NEXUS Strategist", type="STRATEGIST", state=AgentState.IDLE),
    AgentInfo(id="aria-1",       name="ARIA",             type="RESEARCHER",  state=AgentState.IDLE),
    AgentInfo(id="nexuscode-1",  name="NEXUS Code",       type="CODER",       state=AgentState.IDLE),
    AgentInfo(id="clarity-1",    name="CLARITY",          type="WRITER",      state=AgentState.IDLE),
    AgentInfo(id="chronicle-1",  name="CHRONICLE",        type="MEMORY",      state=AgentState.IDLE),
]


@router.get("", response_model=list[AgentInfo])
async def list_agents() -> list[AgentInfo]:
    """Return all agents — live instances merged with static roster."""
    live_list = [a.to_info() for a in _agents.values()]
    live_types = {a.type for a in live_list}

    result: list[AgentInfo] = []
    for static in _ROSTER:
        if static.type in live_types:
            live_agent = next((a for a in live_list if a.type == static.type), None)
            result.append(live_agent or static)
        else:
            result.append(static)
    return result


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str) -> AgentInfo:
    agent = _agents.get(agent_id)
    if agent:
        return agent.to_info()
    static = next((a for a in _ROSTER if a.id == agent_id), None)
    if static:
        return static
    raise HTTPException(404, detail="Agent not found")


@router.get("/{agent_id}/messages")
async def get_agent_messages(agent_id: str) -> list[dict]:
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(404, detail="Agent not found or not currently running")
    return [m.model_dump(mode="json") for m in agent.message_history]


@router.get("/{agent_id}/activity", response_model=list[AgentActivity])
async def get_agent_activity(agent_id: str) -> list[AgentActivity]:
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(404, detail="Agent not found or not currently running")
    return agent.activity_log
