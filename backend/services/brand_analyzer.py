"""
AEO Diagnostic Engine — Phase 6: Cross-AI Brand Analysis
Analyzes brand performance across all AI models for each query.
"""

from typing import Dict, List, Set
from backend.utils.helpers import SeededRandom


def generate_position(mentioned: bool, rng: SeededRandom) -> str:
    """Determine brand position in response."""
    if not mentioned:
        return "Not present"
    r = rng.next()
    if r < 0.35:
        return "Early"
    if r < 0.7:
        return "Mid"
    return "Late"


def generate_sentiment(mentioned: bool, authority: float, rng: SeededRandom) -> str:
    """Determine sentiment toward the brand."""
    if not mentioned:
        return "Neutral"
    if authority > 0.65 or rng.next() > 0.5:
        return "Positive"
    if authority < 0.35 and rng.next() > 0.7:
        return "Negative"
    return "Neutral"


def collect_competitors(
    responses: Dict[str, Dict],
    consensus: Dict,
    brand: str,
) -> List[str]:
    """Aggregate all competitor mentions across all models."""
    comps: Set[str] = set()
    for model_resp in responses.values():
        for b in model_resp.get("mentioned_brands", []):
            if b.lower() != brand.lower():
                comps.add(b)
    for b in consensus.get("mentioned_brands", []):
        if b.lower() != brand.lower():
            comps.add(b)
    return sorted(comps)


def generate_insight(
    brand: str,
    category: str,
    presence: Dict[str, bool],
) -> str:
    """Generate insight explaining why the brand appears or fails across models."""
    ai_models = ["chatgpt", "claude", "gemini", "ollama"]
    mentioned_in = [m for m in ai_models if presence.get(m, False)]
    not_in = [m for m in ai_models if not presence.get(m, False)]

    if len(mentioned_in) == 4:
        return (
            f"{brand} has exceptional cross-AI visibility for this query type. "
            f"All four AI systems recognized the brand, indicating very strong authority "
            f"signals in the {category} space."
        )
    elif len(mentioned_in) == 3:
        absent = not_in[0].capitalize()
        return (
            f"{brand} has strong cross-AI visibility, appearing in 3/4 models. "
            f"Only {absent} didn't mention it. This suggests solid authority signals "
            f"in the {category} space with minor gaps."
        )
    elif len(mentioned_in) > 0:
        present_names = ", ".join(m.capitalize() for m in mentioned_in)
        absent_names = ", ".join(m.capitalize() for m in not_in)
        return (
            f"{brand} appeared in {present_names} but was absent from {absent_names}. "
            f"This suggests inconsistent brand authority signals — the brand may need "
            f"stronger content depth and trust indicators."
        )
    else:
        return (
            f"{brand} was not mentioned by any AI system for this query. "
            f"This indicates a significant visibility gap. Competitors are dominating "
            f"this query space, likely due to stronger content, reviews, and authority signals."
        )


def generate_recommendation(
    brand: str,
    category: str,
    audience: str,
    query: str,
    presence: Dict[str, bool],
    position: str,
) -> str:
    """Generate actionable recommendation for this query."""
    ai_models = ["chatgpt", "claude", "gemini", "ollama"]
    mention_count = sum(1 for m in ai_models if presence.get(m, False))

    if mention_count < 2:
        return (
            f"Create targeted content optimized for \"{query}\" queries. "
            f"Build FAQ pages, comparison guides, and expert reviews that specifically "
            f"address {audience} needs in {category}. Focus on structured data markup."
        )
    elif position != "Early":
        return (
            f"Improve positioning by strengthening authority signals: seek expert mentions, "
            f"build high-quality backlinks, and ensure brand information is semantically "
            f"clear and comprehensive."
        )
    else:
        return (
            f"Maintain current strong position. Focus on expanding to adjacent query types "
            f"and building defensive content against competitor encroachment."
        )
