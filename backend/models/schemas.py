"""
AEO Diagnostic Engine — Pydantic Schemas
Defines request/response models matching Phase 7 JSON output spec.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ─── Request Models ───

class DiagnosticRequest(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=100, description="Brand name to analyze")
    category: str = Field(..., min_length=1, max_length=100, description="Industry/product category")
    audience: str = Field(..., min_length=1, max_length=200, description="Target audience description")
    competitors: List[str] = Field(default_factory=list, description="Optional list of competitors")
    num_queries: int = Field(default=15, ge=5, le=30, description="Number of queries to generate")


# ─── Response Models ───

class BrandPresence(BaseModel):
    chatgpt: bool = False
    claude: bool = False
    gemini: bool = False
    ollama: bool = False
    consensus: bool = False


class AIResponses(BaseModel):
    chatgpt: str = ""
    claude: str = ""
    gemini: str = ""
    ollama: str = ""
    consensus: str = ""


class FeatureScores(BaseModel):
    semantic_similarity: float = 0.0
    mention_frequency: int = 0
    context_score: float = 0.0


class MLScores(BaseModel):
    visibility: float = Field(0.0, ge=0, le=10)
    authority: float = Field(0.0, ge=0, le=10)
    relevance: float = Field(0.0, ge=0, le=10)
    trust: float = Field(0.0, ge=0, le=10)


class QueryResult(BaseModel):
    query: str
    query_type: str = ""
    responses: AIResponses
    brand_presence: BrandPresence
    consensus_strength: float = 0.0
    position: str = "Not present"
    sentiment: str = "Neutral"
    competitors: List[str] = Field(default_factory=list)
    features: FeatureScores = Field(default_factory=FeatureScores)
    scores: MLScores = Field(default_factory=MLScores)
    ai_mention_probability: str = "0%"
    insight: str = ""
    recommendations: str = ""


class PerAIMention(BaseModel):
    chatgpt: int = 0
    claude: int = 0
    gemini: int = 0
    ollama: int = 0


class CompetitorEntry(BaseModel):
    name: str
    frequency: int = 0


class AggregatedAnalysis(BaseModel):
    overall_visibility: int = 0
    mention_rate: int = 0
    consensus_mention_rate: int = 0
    consensus_strength: float = 0.0
    per_ai_mention: PerAIMention = Field(default_factory=PerAIMention)
    avg_scores: MLScores = Field(default_factory=MLScores)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    top_competitors: List[CompetitorEntry] = Field(default_factory=list)
    query_type_failures: Dict[str, int] = Field(default_factory=dict)
    weak_query_clusters: List[str] = Field(default_factory=list)
    worst_ai: Dict[str, object] = Field(default_factory=dict)
    best_competitor: Optional[CompetitorEntry] = None


class GapItem(BaseModel):
    title: str
    detail: str


class ActionItem(BaseModel):
    title: str
    desc: str
    impact: str = "medium"


class ActionWeek(BaseModel):
    title: str
    actions: List[ActionItem] = Field(default_factory=list)


class ActionPlan(BaseModel):
    week1: ActionWeek
    week2: ActionWeek
    advanced: ActionWeek


class PredictiveInsight(BaseModel):
    future_ranking_probability: float = 0.0
    fastest_improving_queries: List[str] = Field(default_factory=list)
    competitor_dominance_risk: str = ""
    trend_projection: Dict[str, float] = Field(default_factory=dict)
    summary: str = ""


class DiagnosticResponse(BaseModel):
    run_id: str
    brand_name: str
    category: str
    audience: str
    mode: str = "simulation"
    results: List[QueryResult] = Field(default_factory=list)
    aggregated: AggregatedAnalysis = Field(default_factory=AggregatedAnalysis)
    gaps: List[GapItem] = Field(default_factory=list)
    predictive: PredictiveInsight = Field(default_factory=PredictiveInsight)
    action_plan: Optional[ActionPlan] = None


class ProgressEvent(BaseModel):
    phase: int
    total_phases: int = 10
    name: str
    pct: int
    detail: str = ""
