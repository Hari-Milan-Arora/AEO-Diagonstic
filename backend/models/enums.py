"""
AEO Diagnostic Engine — Enumerations
Defines all enum types used across the system.
"""

from enum import Enum


class QueryType(str, Enum):
    BEST = "best"
    COMPARISON = "comparison"
    PROBLEM = "problem"
    LONGTAIL = "longtail"


class AIModel(str, Enum):
    CHATGPT = "chatgpt"
    CLAUDE = "claude"
    GEMINI = "gemini"
    OLLAMA = "ollama"
    CONSENSUS = "consensus"


class Position(str, Enum):
    EARLY = "Early"
    MID = "Mid"
    LATE = "Late"
    NOT_PRESENT = "Not present"


class Sentiment(str, Enum):
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"


class ImpactLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
