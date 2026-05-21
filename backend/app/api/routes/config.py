"""Configuration API routes."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/config", tags=["config"])
logger = logging.getLogger(__name__)

# Always write to /data — it's the persistent volume even in Docker where
# /app/config.yaml is mounted read-only.
_WRITE_CONFIG = Path("/data/config.yaml")
_INITIAL_CONFIG = Path(os.environ.get("CONFIG_FILE", "/data/config.yaml"))


def _read_config_raw() -> dict:
    """Read the most current config: user-saved /data copy takes priority."""
    for path in (_WRITE_CONFIG, _INITIAL_CONFIG):
        if path.exists():
            try:
                with open(path) as f:
                    return yaml.safe_load(f) or {}
            except Exception:
                continue
    return {}


def _write_config(data: dict) -> None:
    try:
        _WRITE_CONFIG.parent.mkdir(parents=True, exist_ok=True)
        with open(_WRITE_CONFIG, "w") as f:
            yaml.dump(data, f, default_flow_style=False)
        logger.info("Config saved to %s", _WRITE_CONFIG)
    except Exception as exc:
        logger.error("Failed to write config: %s", exc)


class ConfigUpdate(BaseModel):
    # Field names match the frontend Config type exactly
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    memory_enabled: Optional[bool] = None
    code_execution_enabled: Optional[bool] = None
    max_concurrent_agents: Optional[int] = None


class TestPayload(BaseModel):
    key: Optional[str] = None


@router.get("")
async def get_config() -> dict:
    from app.config import settings
    masked = settings.masked_api_keys()
    return {
        "anthropic_api_key": masked["anthropic"],
        "openai_api_key": masked["openai"],
        "gemini_api_key": masked["google_gemini"],
        "default_model": settings.models.anthropic_model,
        "temperature": settings.models.temperature,
        "max_tokens": settings.models.max_tokens,
        "memory_enabled": True,
        "code_execution_enabled": True,
        "max_concurrent_agents": 3,
    }


@router.put("")
async def update_config(payload: ConfigUpdate) -> dict:
    """Update API keys and model settings, persist to config.yaml."""
    from app.config import settings

    # Update in-memory settings
    if payload.anthropic_api_key is not None:
        settings.api_keys.anthropic = payload.anthropic_api_key or None
    if payload.openai_api_key is not None:
        settings.api_keys.openai = payload.openai_api_key or None
    if payload.gemini_api_key is not None:
        settings.api_keys.google_gemini = payload.gemini_api_key or None
    if payload.default_model is not None:
        settings.models.anthropic_model = payload.default_model
    if payload.temperature is not None:
        settings.models.temperature = payload.temperature
    if payload.max_tokens is not None:
        settings.models.max_tokens = payload.max_tokens

    # Persist non-empty keys to disk
    raw = _read_config_raw()
    raw.setdefault("api_keys", {})
    raw.setdefault("models", {})

    if payload.anthropic_api_key:
        raw["api_keys"]["anthropic"] = payload.anthropic_api_key
    if payload.openai_api_key:
        raw["api_keys"]["openai"] = payload.openai_api_key
    if payload.gemini_api_key:
        raw["api_keys"]["google_gemini"] = payload.gemini_api_key
    if payload.default_model is not None:
        raw["models"]["anthropic_model"] = payload.default_model
    if payload.temperature is not None:
        raw["models"]["temperature"] = payload.temperature
    if payload.max_tokens is not None:
        raw["models"]["max_tokens"] = payload.max_tokens

    _write_config(raw)
    return {"status": "saved"}


@router.post("/test/{provider}")
async def test_connection(provider: str, body: TestPayload = TestPayload()) -> dict:
    """Test connectivity to an LLM provider. Optionally accepts a key in the body
    so the user can test a key before saving it."""
    from app.config import settings
    try:
        if provider == "anthropic":
            key = body.key or settings.api_keys.anthropic
            if not key:
                return {"success": False, "message": "No Anthropic key — enter a key and try again"}
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=key)
            await client.messages.create(
                model=settings.models.anthropic_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "ping"}],
            )
            return {"success": True, "message": "Anthropic connected successfully"}

        elif provider == "openai":
            key = body.key or settings.api_keys.openai
            if not key:
                return {"success": False, "message": "No OpenAI key — enter a key and try again"}
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=key)
            await client.chat.completions.create(
                model=settings.models.openai_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "ping"}],
            )
            return {"success": True, "message": "OpenAI connected successfully"}

        elif provider == "gemini":
            key = body.key or settings.api_keys.google_gemini
            if not key:
                return {"success": False, "message": "No Gemini key — enter a key and try again"}
            import google.generativeai as genai
            genai.configure(api_key=key)
            model = genai.GenerativeModel(settings.models.gemini_model)
            model.generate_content("ping")
            return {"success": True, "message": "Gemini connected successfully"}

        return {"success": False, "message": f"Unknown provider: {provider}"}
    except Exception as exc:
        return {"success": False, "message": str(exc)}
