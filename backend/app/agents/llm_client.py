"""
Shared LLM client helper. Tries Anthropic first, falls back to OpenAI.
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def llm_complete(
    prompt: str,
    system: str = "You are a helpful AI assistant.",
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """
    Call the configured LLM and return the text response.
    Tries Anthropic → OpenAI → Gemini based on available API keys.
    Raises RuntimeError if no provider is available.
    """
    from app.config import settings

    provider = settings.get_active_llm_provider()

    if provider == "anthropic" and settings.api_keys.anthropic:
        return await _anthropic(
            prompt, system, max_tokens, temperature, settings.api_keys.anthropic,
            settings.models.anthropic_model
        )

    if provider in ("openai", "anthropic") and settings.api_keys.openai:
        return await _openai(
            prompt, system, max_tokens, temperature, settings.api_keys.openai,
            settings.models.openai_model
        )

    if settings.api_keys.google_gemini:
        return await _gemini(
            prompt, system, max_tokens, temperature, settings.api_keys.google_gemini,
            settings.models.gemini_model
        )

    # No keys – return a placeholder so agents degrade gracefully
    logger.warning("No LLM API keys configured. Returning placeholder response.")
    return (
        "# LLM Response Unavailable\n\n"
        "No API keys are configured for any LLM provider (Anthropic, OpenAI, or Google Gemini). "
        "Please add API keys to config.yaml or set the appropriate environment variables."
    )


async def _anthropic(
    prompt: str,
    system: str,
    max_tokens: int,
    temperature: float,
    api_key: str,
    model: str,
) -> str:
    import asyncio

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    def _call():
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
    import asyncio

    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    def _call():
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
    import asyncio

    import google.generativeai as genai

    genai.configure(api_key=api_key)

    def _call():
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
