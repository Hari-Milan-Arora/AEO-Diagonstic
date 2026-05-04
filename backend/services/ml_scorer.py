"""
AEO Diagnostic Engine — Phase 5: ML Scoring Layer
Weighted ensemble scoring using extracted features.
Simulates XGBoost/sklearn logic with deterministic scoring.
"""

from typing import Dict
from backend.utils.helpers import clamp, round1


def compute_ml_scores(
    features: Dict,
    presence: Dict[str, bool],
    authority: float,
) -> Dict:
    """
    Compute ML-based scores using weighted ensemble logic.
    
    Produces:
    - Visibility Score (0–10)
    - Authority Score (0–10)
    - Relevance Score (0–10)
    - Trust Score (0–10)
    - AI Mention Probability (0–100%)
    
    Logic:
    - Penalizes inconsistency across models
    - Rewards repeated presence + strong context alignment
    """
    ai_models = ["chatgpt", "claude", "gemini", "ollama"]
    mention_count = sum(1 for m in ai_models if presence.get(m, False))
    consensus_present = presence.get("consensus", False)

    presence_vector = features.get("presence_vector", [0, 0, 0, 0])
    sentiment_score = features.get("sentiment_score", 0)
    similarity = features.get("semantic_similarity", 0)
    richness = features.get("context_richness", 0)
    mention_freq = features.get("mention_frequency", 0)
    position_index = features.get("position_index", -1)

    # ═══ VISIBILITY SCORE ═══
    # How prominent is the brand in AI answers?
    vis = 0
    if mention_count == 0:
        vis = authority * 1.5
    elif mention_count == 1:
        vis = 2.0 + authority * 2
    elif mention_count == 2:
        vis = 3.5 + authority * 2.5
    elif mention_count == 3:
        vis = 5.0 + authority * 2
    elif mention_count == 4:
        vis = 6.0 + authority * 2.5

    if consensus_present:
        vis += 1.0
    # Position bonus
    if position_index >= 0:
        vis += max(0, (1 - position_index)) * 1.2
    # Similarity bonus (ML edge)
    vis += similarity * 0.8

    # ═══ AUTHORITY SCORE ═══
    # Cross-model agreement signals trust
    auth = 0
    if mention_count == 0:
        auth = authority * 2
    elif mention_count == 1:
        auth = 1.5 + authority * 2.5
    elif mention_count == 2:
        auth = 3.0 + authority * 3
    elif mention_count == 3:
        auth = 4.5 + authority * 3
    elif mention_count == 4:
        auth = 5.5 + authority * 3

    if consensus_present:
        auth += 1.2
    if position_index >= 0 and position_index < 0.3:
        auth += 0.8
    # Consistency bonus (all models agree)
    consistency = mention_count / 4
    auth += consistency * 1.0

    # ═══ RELEVANCE SCORE ═══
    # Brand-category-query fit
    rel = authority * 5
    if mention_count > 0:
        rel += 1.5
    if mention_count >= 2:
        rel += 1.0
    if mention_count >= 3:
        rel += 0.5
    if position_index >= 0:
        rel += 0.8
    if mention_count == 0:
        rel = authority * 3.5
    # Semantic similarity boost (ML feature)
    rel += similarity * 1.5
    # Context richness boost
    rel += richness * 0.8

    # ═══ TRUST SCORE ═══
    # Sentiment + consistency signals
    trust = 0
    if mention_count == 0:
        trust = authority * 2
    else:
        if sentiment_score > 0.2:
            trust += 2.5
        elif sentiment_score >= -0.2:
            trust += 1.5
        else:
            trust += 0.5
        trust += mention_count * 0.8
        if consensus_present:
            trust += 1.0
        if position_index >= 0 and position_index < 0.3:
            trust += 1.5
        elif position_index >= 0 and position_index < 0.5:
            trust += 0.8
        trust += authority * 2
    # Mention frequency bonus
    trust += min(mention_freq / 5, 1.0) * 0.5

    # ═══ AI MENTION PROBABILITY ═══
    mention_prob = 0
    if mention_count == 0:
        mention_prob = authority * 15
    elif mention_count == 1:
        mention_prob = 20 + authority * 15
    elif mention_count == 2:
        mention_prob = 40 + authority * 20
    elif mention_count == 3:
        mention_prob = 55 + authority * 20
    elif mention_count == 4:
        mention_prob = 65 + authority * 20

    if consensus_present:
        mention_prob += 10
    if position_index >= 0 and position_index < 0.3:
        mention_prob += 5
    # Penalize inconsistency
    if 0 < mention_count < 3:
        inconsistency_penalty = (4 - mention_count) * 2
        mention_prob -= inconsistency_penalty

    return {
        "visibility": round1(clamp(vis, 0, 10)),
        "authority": round1(clamp(auth, 0, 10)),
        "relevance": round1(clamp(rel, 0, 10)),
        "trust": round1(clamp(trust, 0, 10)),
        "mention_probability": round(clamp(mention_prob, 0, 95)),
    }
