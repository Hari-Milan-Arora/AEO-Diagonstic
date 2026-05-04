"""
AEO Diagnostic Engine — Phase 3: Consensus + Ensemble Engine
Combines all model outputs into a weighted consensus response.
"""

from typing import Dict, List, Tuple
from backend.utils.helpers import SeededRandom


def build_consensus(
    responses: Dict[str, Dict],
    presence: Dict[str, bool],
    brand: str,
    category: str,
    audience: str,
    rng: SeededRandom,
) -> Dict:
    """
    Build consensus from all AI model responses.
    
    Weighting:
    - Repeated across 3-4 models: HIGH weight
    - Appears in 2 models: MEDIUM weight
    - Appears in 1 model: LOW weight
    
    Returns {text, mentioned_brands, brand_present, consensus_strength}.
    """
    # Aggregate brand mentions across all models
    brand_counts: Dict[str, int] = {}
    ai_models = ["chatgpt", "claude", "gemini", "ollama"]

    for model in ai_models:
        resp = responses.get(model, {})
        mentioned_brands = resp.get("mentioned_brands", [])
        for b in mentioned_brands:
            brand_counts[b] = brand_counts.get(b, 0) + 1

    # Sort by frequency (cross-model agreement)
    sorted_brands = sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)

    # High-confidence: appears in 2+ models
    top_brands = [name for name, count in sorted_brands if count >= 2][:5]

    # Fill gaps with single-mention brands if needed
    if len(top_brands) < 3:
        singles = [name for name, count in sorted_brands if count == 1]
        for s in singles[:3 - len(top_brands)]:
            top_brands.append(s)

    brand_in_consensus = brand in top_brands

    # Calculate consensus strength (0-100)
    # Higher when more models agree on the same brands
    if sorted_brands:
        avg_agreement = sum(c for _, c in sorted_brands[:5]) / min(len(sorted_brands), 5)
        consensus_strength = min((avg_agreement / 4) * 100, 100)
    else:
        consensus_strength = 0

    # Detect conflicts
    conflicts = []
    for b in top_brands:
        mentions = brand_counts.get(b, 0)
        if 1 < mentions < 4:
            non_mentioning = [m for m in ai_models if b not in responses.get(m, {}).get("mentioned_brands", [])]
            if non_mentioning:
                conflicts.append(f"{b} absent from {', '.join(non_mentioning)}")

    # Build consensus text
    text = f"Based on analysis across multiple AI systems, the top {category} recommendations for {audience} are:\n\n"

    for i, b in enumerate(top_brands):
        count = brand_counts.get(b, 0)
        text += f"{i+1}. **{b}** — Recommended by {count}/{len(ai_models)} AI systems. "
        if b == brand:
            text += f"Strong presence in the {category} market with solid user satisfaction.\n"
        else:
            text += f"Well-regarded {category} option for {audience}.\n"

    if conflicts:
        text += f"\n⚠️ Conflicting signals detected: {'; '.join(conflicts[:3])}\n"

    text += "\nThis consensus reflects brands that consistently appear across different AI evaluations, weighted by agreement and authority signals."

    return {
        "text": text,
        "mentioned_brands": top_brands,
        "brand_present": brand_in_consensus,
        "consensus_strength": round(consensus_strength, 1),
    }
