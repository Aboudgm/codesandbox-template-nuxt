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

# Always write to /data — persistent volume (Docker mounts /app read-only).
_WRITE_CONFIG = Path("/data/config.yaml")
_INITIAL_CONFIG = Path(os.environ.get("CONFIG_FILE", "/data/config.yaml"))


def _read_config_raw() -> dict:
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


def _friendly_error(exc: Exception, provider: str) -> str:
    """Translate raw SDK exceptions into user-friendly messages."""
    s = str(exc)
    sl = s.lower()
    if any(k in sl for k in ("api key", "invalid", "unauthorized", "401", "api_key_invalid")):
        return f"Invalid API key for {provider}. Double-check the key and try again."
    if any(k in sl for k in ("quota", "billing", "insufficient_quota")):
        return f"Quota exceeded for {provider}. Check your billing or usage limits."
    if any(k in sl for k in ("rate", "429", "too many")):
        return f"Rate limit hit for {provider}. Wait a moment and retry."
    if any(k in sl for k in ("not found", "404", "model")):
        return f"Model not found on {provider}. The model name may have changed."
    if any(k in sl for k in ("timeout", "connect", "network", "unreachable")):
        return f"Network error reaching {provider}. Check your internet connection."
    # Return the raw error but truncated
    return s[:300]


class ConfigUpdate(BaseModel):
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
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
        "xai_api_key": masked.get("xai", ""),
        "default_model": settings.models.gemini_model,
        "temperature": settings.models.temperature,
        "max_tokens": settings.models.max_tokens,
        "memory_enabled": True,
        "code_execution_enabled": True,
        "max_concurrent_agents": 3,
        "active_provider": settings.get_active_llm_provider(),
    }


@router.put("")
async def update_config(payload: ConfigUpdate) -> dict:
    from app.config import settings

    if payload.anthropic_api_key is not None:
        settings.api_keys.anthropic = payload.anthropic_api_key or None
    if payload.openai_api_key is not None:
        settings.api_keys.openai = payload.openai_api_key or None
    if payload.gemini_api_key is not None:
        settings.api_keys.google_gemini = payload.gemini_api_key or None
    if payload.xai_api_key is not None:
        settings.api_keys.xai = payload.xai_api_key or None
    if payload.default_model is not None:
        settings.models.gemini_model = payload.default_model
    if payload.temperature is not None:
        settings.models.temperature = payload.temperature
    if payload.max_tokens is not None:
        settings.models.max_tokens = payload.max_tokens

    raw = _read_config_raw()
    raw.setdefault("api_keys", {})
    raw.setdefault("models", {})

    if payload.anthropic_api_key:
        raw["api_keys"]["anthropic"] = payload.anthropic_api_key
    if payload.openai_api_key:
        raw["api_keys"]["openai"] = payload.openai_api_key
    if payload.gemini_api_key:
        raw["api_keys"]["google_gemini"] = payload.gemini_api_key
    if payload.xai_api_key:
        raw["api_keys"]["xai"] = payload.xai_api_key
    if payload.default_model is not None:
        raw["models"]["gemini_model"] = payload.default_model
    if payload.temperature is not None:
        raw["models"]["temperature"] = payload.temperature
    if payload.max_tokens is not None:
        raw["models"]["max_tokens"] = payload.max_tokens

    _write_config(raw)
    return {"status": "saved", "active_provider": settings.get_active_llm_provider()}


@router.post("/test/{provider}")
async def test_connection(provider: str, body: TestPayload = TestPayload()) -> dict:
    """
    Test connectivity to an LLM provider.
    Accepts an optional key in the body so users can test before saving.
    Returns {success, message, model} for clear feedback.
    """
    from app.config import settings

    provider = provider.lower().strip()

    try:
        # ── Gemini (via httpx REST — no SDK) ─────────────────────────────
        if provider == "gemini":
            key = body.key or settings.api_keys.google_gemini
            if not key:
                return {
                    "success": False,
                    "message": (
                        "No Gemini API key. "
                        "Get a free key at https://aistudio.google.com/apikey"
                    ),
                }
            import httpx

            model_name = settings.models.gemini_model
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            payload = {
                "contents": [{"parts": [{"text": "Reply with exactly one word: OK"}]}],
                "generationConfig": {"maxOutputTokens": 8, "temperature": 0.0},
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, params={"key": key})

            if resp.status_code in (401, 403):
                return {"success": False, "message": "Invalid Gemini API key — check it at aistudio.google.com"}
            if resp.status_code == 400:
                try:
                    msg = resp.json().get("error", {}).get("message", resp.text[:200])
                except Exception:
                    msg = resp.text[:200]
                return {"success": False, "message": f"Gemini error: {msg}"}
            if resp.status_code == 429:
                return {"success": False, "message": "Gemini rate limit hit — wait a moment and retry"}
            if resp.status_code >= 500:
                return {"success": False, "message": f"Gemini server error (HTTP {resp.status_code}) — try again"}
            resp.raise_for_status()

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                block = data.get("promptFeedback", {}).get("blockReason", "unknown")
                return {"success": False, "message": f"Gemini returned no response (blockReason={block})"}

            parts = candidates[0].get("content", {}).get("parts", [])
            preview = "".join(p.get("text", "") for p in parts).strip()[:40]
            return {
                "success": True,
                "message": f"Gemini connected ({model_name}). Response: {preview}",
                "model": model_name,
            }

        # ── Anthropic ────────────────────────────────────────────────────
        elif provider == "anthropic":
            key = body.key or settings.api_keys.anthropic
            if not key:
                return {"success": False, "message": "No Anthropic key — enter a key and try again."}
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=key)
            model_name = settings.models.anthropic_fast_model
            msg = await client.messages.create(
                model=model_name,
                max_tokens=8,
                messages=[{"role": "user", "content": "Say OK"}],
            )
            return {
                "success": True,
                "message": f"Anthropic connected ({model_name}).",
                "model": model_name,
            }

        # ── OpenAI ────────────────────────────────────────────────────────
        elif provider == "openai":
            key = body.key or settings.api_keys.openai
            if not key:
                return {"success": False, "message": "No OpenAI key — enter a key and try again."}
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=key)
            model_name = settings.models.openai_fast_model
            await client.chat.completions.create(
                model=model_name,
                max_tokens=8,
                messages=[{"role": "user", "content": "Say OK"}],
            )
            return {
                "success": True,
                "message": f"OpenAI connected ({model_name}).",
                "model": model_name,
            }

        # ── xAI ────────────────────────────────────────────────────────
        elif provider == "xai":
            key = body.key or settings.api_keys.xai
            if not key:
                return {"success": False, "message": "No xAI key — enter a key and try again."}
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=key, base_url="https://api.x.ai/v1")
            await client.chat.completions.create(
                model="grok-3-mini",
                max_tokens=8,
                messages=[{"role": "user", "content": "Say OK"}],
            )
            return {"success": True, "message": "xAI Grok connected (grok-3-mini).", "model": "grok-3-mini"}

        return {"success": False, "message": f"Unknown provider '{provider}'. Use: gemini, anthropic, openai, xai"}

    except Exception as exc:
        return {"success": False, "message": _friendly_error(exc, provider)}
