"""
LLM client — Gemini-primary cascade with structured error handling.

Provider order: Gemini → Anthropic → OpenAI → xAI

Gemini is called via direct httpx REST (no google-genai SDK) — this eliminates
all SDK version conflicts that plagued starlette/pydantic/httpx compatibility.

Error kinds:
  INVALID_KEY   — bad or revoked API key (skip provider immediately)
  QUOTA         — billing quota exhausted (skip immediately)
  RATE_LIMIT    — too many requests (retry with backoff)
  CONTENT_BLOCK — safety filter triggered (skip immediately)
  NETWORK       — connection/timeout error (retry with backoff)
  UNKNOWN       — catch-all (skip immediately after one attempt)

Retry: up to _MAX_RETRIES per provider, exponential backoff on retryable kinds.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Coroutine, Optional

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_BACKOFF_BASE = 1.0

# Gemini REST endpoint
_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class ErrorKind(str, Enum):
    INVALID_KEY   = "invalid_key"
    QUOTA         = "quota_exceeded"
    RATE_LIMIT    = "rate_limit"
    CONTENT_BLOCK = "content_blocked"
    NETWORK       = "network"
    UNKNOWN       = "unknown"


@dataclass
class LLMError:
    provider: str
    kind: ErrorKind
    detail: str

    def __str__(self) -> str:
        return f"[{self.provider}/{self.kind}] {self.detail}"

    @property
    def retryable(self) -> bool:
        return self.kind in (ErrorKind.RATE_LIMIT, ErrorKind.NETWORK)


def _classify(exc: Exception, provider: str) -> LLMError:
    s = str(exc).lower()
    if any(k in s for k in ("api key", "invalid", "unauthorized", "401", "403", "api_key_invalid", "permission denied")):
        return LLMError(provider, ErrorKind.INVALID_KEY, str(exc)[:300])
    if any(k in s for k in ("quota", "billing", "payment", "insufficient_quota", "resource_exhausted")):
        return LLMError(provider, ErrorKind.QUOTA, str(exc)[:300])
    if any(k in s for k in ("rate", "429", "too many", "ratelimit", "throttle", "quota_exceeded")):
        return LLMError(provider, ErrorKind.RATE_LIMIT, str(exc)[:300])
    if any(k in s for k in ("safety", "blocked", "harm", "policy", "recitation", "finish_reason: safety")):
        return LLMError(provider, ErrorKind.CONTENT_BLOCK, str(exc)[:300])
    if any(k in s for k in ("timeout", "connect", "network", "unreachable", "ssl", "eof", "reset", "connection")):
        return LLMError(provider, ErrorKind.NETWORK, str(exc)[:300])
    return LLMError(provider, ErrorKind.UNKNOWN, str(exc)[:300])


async def llm_complete(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    fast: bool = False,
) -> str:
    """
    Call the best available LLM and return text.

    Cascade: Gemini (REST) → Anthropic → OpenAI → xAI.
    fast=True selects lighter/faster model per provider.
    Raises RuntimeError with an actionable message if all providers fail.
    """
    from app.config import settings

    providers = _build_providers(settings, prompt, system, max_tokens, temperature, fast)

    if not providers:
        return (
            "# No API Keys Configured\n\n"
            "Please add at least one LLM API key in **Settings**.\n\n"
            "**Recommended:** Get a free Gemini key at "
            "[Google AI Studio](https://aistudio.google.com/apikey) — "
            "no credit card required, generous free tier."
        )

    errors: list[LLMError] = []

    for name, call in providers:
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                text = await call()
                if errors:
                    logger.info("Succeeded with %s after %d provider failure(s)", name, len(errors))
                return text
            except Exception as raw:
                err = _classify(raw, name)
                errors.append(err)

                if err.retryable and attempt < _MAX_RETRIES:
                    wait = _BACKOFF_BASE * (2 ** (attempt - 1))
                    logger.warning("%s — retry in %.1fs (%d/%d)", err, wait, attempt, _MAX_RETRIES)
                    await asyncio.sleep(wait)
                    continue

                logger.warning("Skipping %s: %s", name, err)
                break

    # Surface the most actionable error
    for priority_kind in (ErrorKind.INVALID_KEY, ErrorKind.QUOTA, ErrorKind.CONTENT_BLOCK):
        first = next((e for e in errors if e.kind == priority_kind), None)
        if first:
            raise RuntimeError(f"{first.provider} error ({first.kind}): {first.detail}")

    raise RuntimeError(
        f"All {len(providers)} provider(s) failed "
        f"({', '.join(e.provider for e in errors)}). "
        f"Last: {errors[-1].detail}"
    )


# ---------------------------------------------------------------------------
# Provider builder
# ---------------------------------------------------------------------------

def _build_providers(
    settings,
    prompt: str,
    system: str,
    max_tokens: int,
    temperature: float,
    fast: bool,
) -> list[tuple[str, Callable[[], Coroutine]]]:
    pairs: list[tuple[str, Callable[[], Coroutine]]] = []
    keys = settings.api_keys
    models = settings.models

    # ── Gemini via REST (primary — no SDK dependency) ─────────────────
    if keys.google_gemini:
        m = models.gemini_fast_model if fast else models.gemini_model
        pairs.append(("gemini", _make_gemini(prompt, system, max_tokens, temperature, keys.google_gemini, m)))

    # ── Anthropic (Claude) ────────────────────────────────────────────
    if keys.anthropic:
        m = models.anthropic_fast_model if fast else models.anthropic_model
        pairs.append(("anthropic", _make_anthropic(prompt, system, max_tokens, temperature, keys.anthropic, m)))

    # ── OpenAI ────────────────────────────────────────────────────────
    if keys.openai:
        m = models.openai_fast_model if fast else models.openai_model
        pairs.append(("openai", _make_openai(prompt, system, max_tokens, temperature, keys.openai, m)))

    # ── xAI Grok ──────────────────────────────────────────────────────
    if keys.xai:
        pairs.append(("xai", _make_xai(prompt, system, max_tokens, temperature, keys.xai)))

    return pairs


# ---------------------------------------------------------------------------
# Gemini via httpx REST — no SDK, no version conflicts
# ---------------------------------------------------------------------------

def _make_gemini(
    prompt: str, system: str, max_tokens: int, temperature: float, api_key: str, model: str
) -> Callable[[], Coroutine]:
    async def _call() -> str:
        import httpx

        url = _GEMINI_URL.format(model=model)
        payload: dict = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload, params={"key": api_key})

        # Map HTTP errors to actionable exceptions
        if resp.status_code in (400, 401, 403):
            try:
                err_body = resp.json()
                msg = err_body.get("error", {}).get("message", resp.text[:200])
            except Exception:
                msg = resp.text[:200]
            status = resp.status_code
            if status in (401, 403) or "api key" in msg.lower() or "invalid" in msg.lower():
                raise PermissionError(f"Invalid Gemini API key (HTTP {status}): {msg}")
            raise ValueError(f"Gemini API error (HTTP {status}): {msg}")

        if resp.status_code == 429:
            raise RuntimeError("Gemini rate limit exceeded (429) — backing off")

        if resp.status_code >= 500:
            raise ConnectionError(f"Gemini server error (HTTP {resp.status_code})")

        resp.raise_for_status()
        data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            # Could be a prompt_feedback block
            feedback = data.get("promptFeedback", {})
            block_reason = feedback.get("blockReason", "UNKNOWN")
            raise ValueError(f"Gemini returned no candidates (blockReason={block_reason})")

        candidate = candidates[0]
        finish_reason = candidate.get("finishReason", "")
        if finish_reason == "SAFETY":
            raise ValueError("Gemini content blocked by safety filter (SAFETY finish_reason)")

        parts = candidate.get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()

        if not text:
            raise ValueError(f"Gemini returned empty text (finishReason={finish_reason})")

        return text

    return _call


# ---------------------------------------------------------------------------
# Anthropic (Claude) — async SDK
# ---------------------------------------------------------------------------

def _make_anthropic(
    prompt: str, system: str, max_tokens: int, temperature: float, api_key: str, model: str
) -> Callable[[], Coroutine]:
    async def _call() -> str:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)
        msg = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    return _call


# ---------------------------------------------------------------------------
# OpenAI — async SDK
# ---------------------------------------------------------------------------

def _make_openai(
    prompt: str, system: str, max_tokens: int, temperature: float, api_key: str, model: str
) -> Callable[[], Coroutine]:
    async def _call() -> str:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        resp = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    return _call


# ---------------------------------------------------------------------------
# xAI Grok — OpenAI-compatible async
# ---------------------------------------------------------------------------

def _make_xai(
    prompt: str, system: str, max_tokens: int, temperature: float, api_key: str, model: str = "grok-3"
) -> Callable[[], Coroutine]:
    async def _call() -> str:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        resp = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    return _call
