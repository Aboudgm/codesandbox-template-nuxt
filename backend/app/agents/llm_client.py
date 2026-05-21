"""
LLM client — Gemini-primary cascade with structured error handling.

Provider order: Gemini → Anthropic → OpenAI → xAI
- Rate-limit and network errors trigger exponential backoff retry.
- Auth/quota errors skip immediately to the next provider.
- Surfaces actionable error messages (key invalid, quota hit, etc.).
- All providers use proper async calls (no run_in_executor).
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
    if any(k in s for k in ("api key", "invalid", "unauthorized", "401", "api_key_invalid", "permission")):
        return LLMError(provider, ErrorKind.INVALID_KEY, str(exc)[:250])
    if any(k in s for k in ("quota", "billing", "payment", "exceeded your", "insufficient_quota")):
        return LLMError(provider, ErrorKind.QUOTA, str(exc)[:250])
    if any(k in s for k in ("rate", "429", "too many", "ratelimit", "throttle")):
        return LLMError(provider, ErrorKind.RATE_LIMIT, str(exc)[:250])
    if any(k in s for k in ("safety", "blocked", "finish_reason", "harm", "policy", "recitation")):
        return LLMError(provider, ErrorKind.CONTENT_BLOCK, str(exc)[:250])
    if any(k in s for k in ("timeout", "connect", "network", "unreachable", "ssl", "eof", "reset")):
        return LLMError(provider, ErrorKind.NETWORK, str(exc)[:250])
    return LLMError(provider, ErrorKind.UNKNOWN, str(exc)[:250])


async def llm_complete(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    fast: bool = False,
) -> str:
    """
    Call the best available LLM and return text.

    Cascade: Gemini → Anthropic → OpenAI → xAI.
    fast=True selects lighter/faster models per provider.
    Raises RuntimeError if all providers fail.
    """
    from app.config import settings

    providers = _build_providers(settings, prompt, system, max_tokens, temperature, fast)

    if not providers:
        return (
            "# No API Keys Configured\n\n"
            "Please add at least one LLM API key in **Settings**.\n\n"
            "**Recommended:** Get a free Gemini key at "
            "[Google AI Studio](https://aistudio.google.com/apikey) — "
            "generous free tier, no credit card required."
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
                    logger.warning(
                        "%s — retrying in %.1fs (attempt %d/%d)", err, wait, attempt, _MAX_RETRIES
                    )
                    await asyncio.sleep(wait)
                    continue

                # Non-retryable or final attempt — move to next provider
                logger.warning("Skipping %s: %s", name, err)
                break

    # Surface the most actionable error message
    for priority_kind in (ErrorKind.INVALID_KEY, ErrorKind.QUOTA, ErrorKind.CONTENT_BLOCK):
        first = next((e for e in errors if e.kind == priority_kind), None)
        if first:
            raise RuntimeError(
                f"{first.provider} error ({first.kind}): {first.detail}"
            )

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

    # ── Gemini (primary) ──────────────────────────────────────────────────
    if keys.google_gemini:
        m = models.gemini_fast_model if fast else models.gemini_model
        pairs.append((
            "gemini",
            _make_gemini(prompt, system, max_tokens, temperature, keys.google_gemini, m),
        ))

    # ── Anthropic ─────────────────────────────────────────────────────────
    if keys.anthropic:
        m = models.anthropic_fast_model if fast else models.anthropic_model
        pairs.append((
            "anthropic",
            _make_anthropic(prompt, system, max_tokens, temperature, keys.anthropic, m),
        ))

    # ── OpenAI ────────────────────────────────────────────────────────────
    if keys.openai:
        m = models.openai_fast_model if fast else models.openai_model
        pairs.append((
            "openai",
            _make_openai(prompt, system, max_tokens, temperature, keys.openai, m),
        ))

    # ── xAI Grok ──────────────────────────────────────────────────────────
    if keys.xai:
        pairs.append((
            "xai",
            _make_xai(prompt, system, max_tokens, temperature, keys.xai),
        ))

    return pairs


# ---------------------------------------------------------------------------
# Provider factories (return coroutine callables to avoid lambda capture bugs)
# ---------------------------------------------------------------------------

def _make_gemini(
    prompt: str, system: str, max_tokens: int, temperature: float, api_key: str, model: str
) -> Callable[[], Coroutine]:
    async def _call() -> str:
        from google import genai
        from google.genai import types as gtypes

        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=gtypes.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        if not response.text:
            finish = getattr(response.candidates[0], "finish_reason", "unknown") if response.candidates else "unknown"
            raise ValueError(f"Empty Gemini response (finish_reason={finish})")
        return response.text

    return _call


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
