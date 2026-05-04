"""
AEO Diagnostic Engine — NLP Utilities
Rule-based sentiment analysis, semantic similarity, and text feature extraction.
"""

import math
import re
from typing import List, Tuple

from backend.utils.helpers import clamp


# ─── Sentiment Lexicons ───

POSITIVE_WORDS = {
    "best", "top", "excellent", "outstanding", "great", "superior", "leading",
    "recommended", "popular", "trusted", "reliable", "innovative", "premium",
    "quality", "proven", "strong", "solid", "well-known", "reputable", "high-rated",
    "favorite", "preferred", "award-winning", "acclaimed", "impressive", "effective",
    "loved", "highly-rated", "well-reviewed", "standout", "exceptional", "remarkable",
}

NEGATIVE_WORDS = {
    "worst", "poor", "bad", "unreliable", "weak", "lacking", "overpriced",
    "disappointing", "mediocre", "inferior", "outdated", "limited", "avoid",
    "struggling", "declining", "controversial", "problematic", "risky",
    "unknown", "unproven", "criticized", "flawed", "subpar",
}

NEUTRAL_WORDS = {
    "available", "option", "alternative", "consider", "depends", "varies",
    "some", "certain", "may", "might", "could", "sometimes",
}


def analyze_sentiment(text: str) -> Tuple[str, float]:
    """
    Rule-based sentiment analysis.
    Returns (label, score) where score is -1.0 to 1.0.
    """
    words = set(re.findall(r'\b\w+\b', text.lower()))
    pos_count = len(words & POSITIVE_WORDS)
    neg_count = len(words & NEGATIVE_WORDS)
    total = pos_count + neg_count

    if total == 0:
        return "Neutral", 0.0

    score = (pos_count - neg_count) / total
    if score > 0.2:
        return "Positive", clamp(score, 0, 1)
    elif score < -0.2:
        return "Negative", clamp(score, -1, 0)
    return "Neutral", score


def compute_semantic_similarity(text_a: str, text_b: str) -> float:
    """
    Compute semantic similarity using term overlap (Jaccard-like).
    Returns 0.0 to 1.0.
    """
    words_a = set(re.findall(r'\b\w{3,}\b', text_a.lower()))
    words_b = set(re.findall(r'\b\w{3,}\b', text_b.lower()))

    if not words_a or not words_b:
        return 0.0

    intersection = words_a & words_b
    union = words_a | words_b
    jaccard = len(intersection) / len(union)

    # Boost for longer overlap
    overlap_ratio = len(intersection) / min(len(words_a), len(words_b))
    return clamp((jaccard * 0.4 + overlap_ratio * 0.6), 0, 1)


def compute_context_richness(text: str, brand: str, category: str) -> float:
    """
    Score how contextually rich a response is relative to the brand and category.
    Higher scores indicate more detailed, relevant content.
    """
    text_lower = text.lower()
    brand_lower = brand.lower()
    category_lower = category.lower()

    # Length factor (longer = richer, with diminishing returns)
    word_count = len(text.split())
    length_score = min(word_count / 150, 1.0)

    # Brand mention density
    brand_mentions = text_lower.count(brand_lower)
    brand_score = min(brand_mentions / 3, 1.0)

    # Category relevance
    category_words = set(category_lower.split())
    text_words = set(text_lower.split())
    cat_overlap = len(category_words & text_words) / max(len(category_words), 1)

    # Structure indicators (numbered lists, bold, etc.)
    has_structure = 1.0 if re.search(r'\d+\.|\*\*|•|→', text) else 0.3

    return clamp(
        length_score * 0.25 + brand_score * 0.3 + cat_overlap * 0.25 + has_structure * 0.2,
        0, 1
    )


def count_brand_mentions(text: str, brand: str) -> int:
    """Count how many times a brand is mentioned in text (case-insensitive)."""
    return len(re.findall(re.escape(brand), text, re.IGNORECASE))
