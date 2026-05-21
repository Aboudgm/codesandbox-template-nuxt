"""Configuration API routes."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/config", tags=["config"])
logger = logging.getLogger(__name__)


class ConfigUpdate(BaseModel):
    anthropic_key: str | None = None
    openai_key: str | None = None
    google_gemini_key: str | None = None
    default_model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None


@router.get("")
async def get_config() -> dict:
    from app.config import settings
    return {
        "api_keys": settings.masked_api_keys(),
        "models": {
            "default": settings.models.anthropic_model,
            "fast": settings.models.openai_model,
            "temperature": settings.models.temperature,
            "max_tokens": settings.models.max_tokens,
        },
        "memory": {
            "enabled": True,
            "max_memories": settings.memory.max_memories,
        },
        "sandbox": {
            "enabled": True,
            "timeout": settings.sandbox.execution_timeout,
            "languages": settings.sandbox.allowed_languages,
        },
        "server": {
            "debug": settings.debug,
            "log_level": settings.log_level,
        },
    }


@router.put("")
async def update_config(payload: ConfigUpdate) -> dict:
    """Update API keys at runtime without restart."""
    from app.config import settings
    if payload.anthropic_key is not None:
        settings.api_keys.anthropic = payload.anthropic_key or None
    if payload.openai_key is not None:
        settings.api_keys.openai = payload.openai_key or None
    if payload.google_gemini_key is not None:
        settings.api_keys.google_gemini = payload.google_gemini_key or None
    if payload.default_model is not None:
        settings.models.anthropic_model = payload.default_model
    if payload.temperature is not None:
        settings.models.temperature = payload.temperature
    if payload.max_tokens is not None:
        settings.models.max_tokens = payload.max_tokens
    return {"status": "updated"}


@router.post("/test")
async def test_connection(provider: str) -> dict:
    """Test connectivity to an LLM provider."""
    from app.config import settings
    try:
        if provider == "anthropic":
            if not settings.api_keys.anthropic:
                return {"ok": False, "error": "No Anthropic key configured"}
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.api_keys.anthropic)
            await client.messages.create(
                model=settings.models.anthropic_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "ping"}],
            )
            return {"ok": True, "provider": "anthropic"}

        elif provider == "openai":
            if not settings.api_keys.openai:
                return {"ok": False, "error": "No OpenAI key configured"}
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.api_keys.openai)
            await client.chat.completions.create(
                model=settings.models.openai_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "ping"}],
            )
            return {"ok": True, "provider": "openai"}

        elif provider == "gemini":
            if not settings.api_keys.google_gemini:
                return {"ok": False, "error": "No Gemini key configured"}
            import google.generativeai as genai
            genai.configure(api_key=settings.api_keys.google_gemini)
            model = genai.GenerativeModel(settings.models.gemini_model)
            model.generate_content("ping")
            return {"ok": True, "provider": "gemini"}

        return {"ok": False, "error": f"Unknown provider: {provider}"}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
