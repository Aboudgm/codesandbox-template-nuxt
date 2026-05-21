"""
Configuration management for the multi-agent AI framework.
Loads settings from config.yaml with environment variable overrides.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import yaml
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine config file path
CONFIG_FILE = Path(os.environ.get("CONFIG_FILE", "/data/config.yaml"))
FALLBACK_CONFIG = Path(__file__).parent.parent / "config.yaml"


def _load_yaml() -> dict:
    """Load YAML config file, trying /data first then local fallback."""
    for path in (CONFIG_FILE, FALLBACK_CONFIG):
        if path.exists():
            with open(path) as f:
                return yaml.safe_load(f) or {}
    return {}


_yaml_data: dict = _load_yaml()


class APIKeysSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="API_KEY_", extra="ignore")

    anthropic: Optional[str] = Field(
        default=_yaml_data.get("api_keys", {}).get("anthropic", None)
    )
    openai: Optional[str] = Field(
        default=_yaml_data.get("api_keys", {}).get("openai", None)
    )
    google_gemini: Optional[str] = Field(
        default=_yaml_data.get("api_keys", {}).get("google_gemini", None)
    )


class ModelSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MODEL_", extra="ignore")

    default_provider: str = Field(
        default=_yaml_data.get("models", {}).get("default_provider", "anthropic")
    )
    anthropic_model: str = Field(
        default=_yaml_data.get("models", {}).get(
            "anthropic_model", "claude-3-5-sonnet-20241022"
        )
    )
    openai_model: str = Field(
        default=_yaml_data.get("models", {}).get("openai_model", "gpt-4o")
    )
    gemini_model: str = Field(
        default=_yaml_data.get("models", {}).get(
            "gemini_model", "gemini-1.5-pro"
        )
    )
    max_tokens: int = Field(
        default=_yaml_data.get("models", {}).get("max_tokens", 4096)
    )
    temperature: float = Field(
        default=_yaml_data.get("models", {}).get("temperature", 0.7)
    )


class MemorySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MEMORY_", extra="ignore")

    vector_db_path: str = Field(
        default=_yaml_data.get("memory", {}).get(
            "vector_db_path", "/data/chroma"
        )
    )
    episodic_db_path: str = Field(
        default=_yaml_data.get("memory", {}).get(
            "episodic_db_path", "/data/episodic.db"
        )
    )
    embedding_model: str = Field(
        default=_yaml_data.get("memory", {}).get(
            "embedding_model", "all-MiniLM-L6-v2"
        )
    )
    max_memories: int = Field(
        default=_yaml_data.get("memory", {}).get("max_memories", 1000)
    )


class SandboxSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SANDBOX_", extra="ignore")

    workspace_path: str = Field(
        default=_yaml_data.get("sandbox", {}).get(
            "workspace_path", "/data/workspace"
        )
    )
    execution_timeout: int = Field(
        default=_yaml_data.get("sandbox", {}).get("execution_timeout", 30)
    )
    max_output_size: int = Field(
        default=_yaml_data.get("sandbox", {}).get("max_output_size", 65536)
    )
    allowed_languages: list[str] = Field(
        default=_yaml_data.get("sandbox", {}).get(
            "allowed_languages", ["python", "javascript", "bash"]
        )
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APP_",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    debug: bool = Field(default=_yaml_data.get("app", {}).get("debug", False))
    host: str = Field(default=_yaml_data.get("app", {}).get("host", "0.0.0.0"))
    port: int = Field(default=_yaml_data.get("app", {}).get("port", 8000))
    log_level: str = Field(
        default=_yaml_data.get("app", {}).get("log_level", "info")
    )

    # Nested settings (instantiated once)
    api_keys: APIKeysSettings = Field(default_factory=APIKeysSettings)
    models: ModelSettings = Field(default_factory=ModelSettings)
    memory: MemorySettings = Field(default_factory=MemorySettings)
    sandbox: SandboxSettings = Field(default_factory=SandboxSettings)

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"debug", "info", "warning", "error", "critical"}
        v = v.lower()
        if v not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return v

    def get_active_llm_provider(self) -> str:
        """Return the first available LLM provider based on API keys."""
        if self.api_keys.anthropic:
            return "anthropic"
        if self.api_keys.openai:
            return "openai"
        if self.api_keys.google_gemini:
            return "gemini"
        return self.models.default_provider

    def masked_api_keys(self) -> dict:
        """Return API keys with values masked for safe display."""

        def mask(val: Optional[str]) -> str:
            if not val:
                return ""
            if len(val) <= 8:
                return "***"
            return val[:4] + "***" + val[-4:]

        return {
            "anthropic": mask(self.api_keys.anthropic),
            "openai": mask(self.api_keys.openai),
            "google_gemini": mask(self.api_keys.google_gemini),
        }


# Global singleton
settings = Settings()


def reload_settings() -> Settings:
    """Reload settings from disk (e.g. after config update)."""
    global _yaml_data, settings
    _yaml_data = _load_yaml()
    settings = Settings()
    return settings
