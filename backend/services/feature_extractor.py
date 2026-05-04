"""
AEO Diagnostic Engine — Phase 4: Feature Extraction (ML Input)
Extracts numerical features from each query's AI responses for ML scoring.
"""

from typing import Dict, List
from backend.utils.nlp import (
    analyze_sentiment,
    compute_semantic_similarity,
    compute_context_richness,
    count_brand_mentions,
)
from backend.models.schemas import FeatureScores


AI_MODELS = ["chatgpt", "claude", "gemini", "ollama"]


def extract_features(
    query: str,
    brand: str,
    category: str,
    responses: Dict[str, Dict],
    presence: Dict[str, bool],
    consensus: Dict,
) -> Dict:
    """
    Extract ML-ready features from a single query's responses.
    
    Features:
    - brand_presence_vector: binary presence per model [0/1, 0/1, 0/1, 0/1]
    - position_index: normalized position (0=early, 0.5=mid, 1=late, -1=absent)
    - sentiment_score: NLP-based (-1 to 1)
    - mention_frequency: total brand mentions across all responses
    - semantic_similarity: query ↔ combined response similarity
    - competitor_frequency: how many competitor mentions total
    - context_richness: how detailed/relevant the responses are
    """
    # Brand presence binary vector
    presence_vector = [1 if presence.get(m, False) else 0 for m in AI_MODELS]

    # Combine all response texts
    all_text = " ".join(
        responses.get(m, {}).get("text", "") for m in AI_MODELS
    )
    consensus_text = consensus.get("text", "")
    full_text = all_text + " " + consensus_text

    # Mention frequency
    mention_freq = count_brand_mentions(full_text, brand)

    # Sentiment analysis on combined responses
    sentiment_label, sentiment_score = analyze_sentiment(full_text)

    # Semantic similarity between query and combined context
    brand_context = f"{brand} {category} {full_text}"
    similarity = compute_semantic_similarity(query, brand_context)

    # Context richness
    richness = compute_context_richness(full_text, brand, category)

    # Competitor frequency
    comp_count = 0
    for m in AI_MODELS:
        mentioned = responses.get(m, {}).get("mentioned_brands", [])
        comp_count += len([b for b in mentioned if b.lower() != brand.lower()])

    # Position index normalization
    mention_count = sum(presence_vector)
    if mention_count == 0:
        position_index = -1.0
    elif mention_count >= 3:
        position_index = 0.1  # Strong early presence
    elif mention_count == 2:
        position_index = 0.35
    else:
        position_index = 0.65

    return {
        "presence_vector": presence_vector,
        "position_index": position_index,
        "sentiment_label": sentiment_label,
        "sentiment_score": round(sentiment_score, 3),
        "mention_frequency": mention_freq,
        "semantic_similarity": round(similarity, 3),
        "competitor_frequency": comp_count,
        "context_richness": round(richness, 3),
        "feature_scores": FeatureScores(
            semantic_similarity=round(similarity, 3),
            mention_frequency=mention_freq,
            context_score=round(richness, 3),
        ),
    }
