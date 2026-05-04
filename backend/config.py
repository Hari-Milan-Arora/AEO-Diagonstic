"""
AEO Diagnostic Engine — Configuration & Settings
Manages environment variables, API keys, and system defaults.
"""

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Settings:
    """Application configuration loaded from environment variables."""

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True

    # AI API Keys (optional — simulation mode if absent)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None

    # Ollama Configuration
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_ENABLED: bool = True

    # Engine defaults
    DEFAULT_QUERY_COUNT: int = 15
    MIN_QUERIES: int = 5
    MAX_QUERIES: int = 30

    # Mode
    SIMULATION_MODE: bool = True  # Default to simulation

    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)

    @property
    def has_anthropic(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

    @property
    def has_google_ai(self) -> bool:
        return bool(self.GOOGLE_AI_API_KEY)

    @property
    def any_real_api(self) -> bool:
        return self.has_openai or self.has_anthropic or self.has_google_ai

    @classmethod
    def from_env(cls) -> "Settings":
        """Load settings from environment variables."""
        return cls(
            HOST=os.getenv("HOST", "127.0.0.1"),
            PORT=int(os.getenv("PORT", "8000")),
            DEBUG=os.getenv("DEBUG", "true").lower() == "true",
            OPENAI_API_KEY=os.getenv("OPENAI_API_KEY"),
            ANTHROPIC_API_KEY=os.getenv("ANTHROPIC_API_KEY"),
            GOOGLE_AI_API_KEY=os.getenv("GOOGLE_AI_API_KEY"),
            OLLAMA_HOST=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
            OLLAMA_MODEL=os.getenv("OLLAMA_MODEL", "llama3"),
            OLLAMA_ENABLED=os.getenv("OLLAMA_ENABLED", "true").lower() == "true",
            DEFAULT_QUERY_COUNT=int(os.getenv("DEFAULT_QUERY_COUNT", "15")),
            SIMULATION_MODE=os.getenv("SIMULATION_MODE", "true").lower() == "true",
        )


# Singleton settings instance
settings = Settings.from_env()
