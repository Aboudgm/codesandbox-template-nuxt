"""
Shared LLM client helper.
Cascade: Anthropic → OpenAI → Gemini → xAI (fallback).
Supports fast=True to select smaller/cheaper models.
Includes exponential-backoff retry on rate-limit errors (up to 3 attempts).
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Maximum retry attempts on rate-limit / transient errors
_MAX_RETRIES = 3
# Base delay in seconds for exponential backoff
_BACKOFF_BASE = 1.0


async def llm_complete(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    fast: bool = False,
) -> str:
    """
    Call the configured LLM and return the text response.

    Tries Anthropic → OpenAI → Gemini → xAI based on available API keys.
    When fast=True, uses smaller/cheaper models for each provider.
    Applies exponential-backoff retry (up to 3 attempts) on rate-limit errors.

    Raises RuntimeError if no provider is available.
    """
    from app.config import settings

    # Build ordered provider list based on configured keys
    providers: list[tuple[str, callable]] = []

    if settings.api_keys.anthropic:
        model = (
            settings.models.anthropic_fast_model
            if fast
            else settings.models.anthropic_model
        )
        providers.append(
            (
                "anthropic",
                lambda p=prompt, s=system, mt=max_tokens, t=temperature, k=settings.api_keys.anthropic, m=model: _anthropic(
                    p, s, mt, t, k, m
                ),
            )
        )

    if settings.api_keys.openai:
        model = (
            settings.models.openai_fast_model
            if fast
            else settings.models.openai_model
        )
        providers.append(
            (
                "openai",
                lambda p=prompt, s=system, mt=max_tokens, t=temperature, k=settings.api_keys.openai, m=model: _openai(
                    p, s, mt, t, k, m
                ),
            )
        )

    if settings.api_keys.google_gemini:
        providers.append(
            (
                "gemini",
                lambda p=prompt, s=system, mt=max_tokens, t=temperature, k=settings.api_keys.google_gemini, m=settings.models.gemini_model: _gemini(
                    p, s, mt, t, k, m
                ),
            )
        )

    if settings.api_keys.xai:
        providers.append(
            (
                "xai",
                lambda p=prompt, s=system, mt=max_tokens, t=temperature, k=settings.api_keys.xai: _xai(
                    p, s, mt, t, k
                ),
            )
        )

    if not providers:
        logger.warning("No LLM API keys configured. Returning placeholder response.")
        return (
            "# LLM Response Unavailable\n\n"
            "No API keys are configured for any LLM provider "
            "(Anthropic, OpenAI, Google Gemini, or xAI). "
            "Please add API keys to config.yaml or set the appropriate environment variables."
        )

    # Try each provider in cascade order, with retry on rate-limit errors
    last_exc: Optional[Exception] = None
    for provider_name, caller in providers:
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                result = await caller()
                return result
            except Exception as exc:
                exc_str = str(exc).lower()
                is_rate_limit = any(
                    kw in exc_str
                    for kw in ("rate limit", "rate_limit", "429", "too many requests", "ratelimit")
                )
                if is_rate_limit and attempt < _MAX_RETRIES:
                    delay = _BACKOFF_BASE * (2 ** (attempt - 1))
                    logger.warning(
                        "Rate limit hit on %s (attempt %d/%d). Retrying in %.1fs…",
                        provider_name, attempt, _MAX_RETRIES, delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                # Non-rate-limit error or final retry — move to next provider
                logger.warning(
                    "Provider %s failed (attempt %d): %s", provider_name, attempt, exc
                )
                last_exc = exc
                break

    raise RuntimeError(
        f"All LLM providers failed. Last error: {last_exc}"
    )


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

async def _anthropic(
    prompt: str,
    system: str,
    max_tokens: int,
    temperature: float,
    api_key: str,
    model: str,
) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    def _call() -> str:
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    return await asyncio.get_event_loop().run_in_executor(None, _call)


async def _openai(
    prompt: str,
    system: str,
    max_tokens: int,
    temperature: float,
    api_key: str,
    model: str,
) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    def _call() -> str:
        resp = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    return await asyncio.get_event_loop().run_in_executor(None, _call)


async def _gemini(
    prompt: str,
    system: str,
    max_tokens: int,
    temperature: float,
    api_key: str,
    model: str,
) -> str:
    import google.generativeai as genai

    genai.configure(api_key=api_key)

    def _call() -> str:
        gen_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system,
            generation_config=genai.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        response = gen_model.generate_content(prompt)
        return response.text

    return await asyncio.get_event_loop().run_in_executor(None, _call)


async def _xai(
    prompt: str,
    system: str,
    max_tokens: int,
    temperature: float,
    api_key: str,
    model: str = "grok-3",
) -> str:
    """xAI Grok via OpenAI-compatible API."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")

    def _call() -> str:
        resp = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    return await asyncio.get_event_loop().run_in_executor(None, _call)
