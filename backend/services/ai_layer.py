"""
AEO Diagnostic Engine — Phase 2: Multi-AI + Ollama Response Layer
Generates independent responses from ChatGPT, Claude, Gemini, and Ollama.
Supports both simulation mode and real API calls.
"""

from typing import Dict, List, Tuple
from backend.utils.helpers import hash_str, SeededRandom, clamp


# ─── Brand Authority Estimation ───

def estimate_brand_authority(brand: str, category: str, rng: SeededRandom) -> float:
    """
    Estimate brand authority (0.15–0.75).
    Higher = more likely to appear in AI training data.
    """
    name_len = len(brand)
    base = 0.22
    if name_len > 3:
        base += 0.08
    if name_len > 6:
        base += 0.06
    if name_len > 10:
        base += 0.04

    cat_bonus = (hash_str(brand + category) % 18) / 100
    noise = rng.next() * 0.1
    return clamp(base + cat_bonus + noise, 0.15, 0.75)


def should_mention_brand(authority: float, model: str, query_type: str, rng: SeededRandom) -> bool:
    """Determine if a model should mention the brand given authority + context."""
    thresholds = {"chatgpt": 0.40, "claude": 0.46, "gemini": 0.36, "ollama": 0.42}
    type_bonus = {"best": 0.06, "comparison": 0.20, "problem": -0.05, "longtail": 0.03}
    noise = (rng.next() - 0.55) * 0.22
    prob = authority + type_bonus.get(query_type, 0) + noise
    return prob > thresholds.get(model, 0.42)


# ─── Response Templates ───

RESPONSE_INTROS = {
    "chatgpt": [
        "When looking at {category} options for {audience}, several brands stand out.",
        "Here's a breakdown of the top {category} choices for {audience}.",
        "Based on current market data, here are the best {category} for {audience}.",
    ],
    "claude": [
        "This is a great question. Choosing the right {category} for {audience} involves several factors worth considering carefully.",
        "I'd be happy to help you navigate the {category} landscape. For {audience}, there are important nuances to consider.",
        "Let me provide a thoughtful analysis of {category} options that would best serve {audience}.",
    ],
    "gemini": [
        "Top {category} for {audience} include:",
        "According to recent reviews and trends, here are leading {category} for {audience}.",
        "Here are the most recommended {category} for {audience} based on current data.",
    ],
    "ollama": [
        "Looking at {category} options for {audience}, here's what I can share from available data.",
        "Based on general knowledge about {category}, here are some options for {audience}.",
        "For {audience} seeking {category}, here are the key contenders worth evaluating.",
    ],
}

BRAND_SNIPPETS = {
    "chatgpt": {
        "positive": [
            "**{brand}** is a solid option in the {category} space, known for quality and reliability.",
            "{brand} offers competitive {category} solutions with good customer satisfaction.",
            "Many users recommend **{brand}** for its consistent performance in {category}.",
        ],
        "negative": [
            "{brand} exists in this space but may not be the top choice for everyone.",
        ],
    },
    "claude": {
        "positive": [
            "{brand} is worth considering — they've built a reputation in the {category} market through consistent quality, though it's worth comparing their specific offerings to your needs.",
            "I'd mention {brand} as a notable player in {category}. They tend to focus on delivering reliable products, which many {category} users appreciate.",
            "{brand} has carved out a presence in the {category} space. Their approach emphasizes quality, though as with any brand, your mileage may vary depending on specific needs.",
        ],
        "negative": [
            "{brand} is present in the {category} market, though they face stiff competition from more established players.",
        ],
    },
    "gemini": {
        "positive": [
            "{brand} — Popular {category} brand with strong reviews.",
            "{brand}: Well-rated {category} option. Known for reliability.",
            "{brand} is frequently recommended for {category}.",
        ],
        "negative": [
            "{brand} — Available but less commonly recommended.",
        ],
    },
    "ollama": {
        "positive": [
            "{brand} appears to be a recognized name in {category} with generally favorable reception.",
            "{brand} has a presence in the {category} market segment with moderate to positive feedback.",
            "From available data, {brand} is a viable {category} option worth considering.",
        ],
        "negative": [
            "{brand} is listed among {category} options but lacks strong distinguishing features from this perspective.",
        ],
    },
}


def _build_brand_snippet(brand: str, category: str, sentiment: str, model: str) -> str:
    """Build a brand mention snippet for the given model."""
    tone = "negative" if sentiment == "Negative" else "positive"
    snippets = BRAND_SNIPPETS.get(model, BRAND_SNIPPETS["chatgpt"])[tone]
    idx = hash_str(brand + model) % len(snippets)
    return snippets[idx].replace("{brand}", brand).replace("{category}", category)


def generate_simulated_response(
    query: str,
    brand: str,
    category: str,
    audience: str,
    competitors: List[str],
    mentioned: bool,
    model: str,
    rng: SeededRandom,
) -> Dict:
    """
    Generate a simulated AI response for one model.
    Returns {text, mentioned_brands}.
    """
    intros = RESPONSE_INTROS[model]
    intro = intros[int(rng.next() * len(intros))]
    intro = intro.replace("{category}", category).replace("{audience}", audience)

    all_brands = list(competitors)
    if mentioned:
        pos = int(rng.next() * (len(all_brands) + 1))
        all_brands.insert(pos, brand)

    sentiment = "Positive" if (mentioned and rng.next() > 0.3) else "Neutral"
    mentioned_comps = [b for b in all_brands if rng.next() > 0.25 or b == brand][:5]

    body = ""
    if model == "chatgpt":
        body = "\n\n"
        for i, b in enumerate(mentioned_comps):
            if b == brand:
                body += f"{i+1}. {_build_brand_snippet(brand, category, sentiment, model)}\n"
            else:
                body += f"{i+1}. **{b}** — A well-known {category} option popular among {audience}.\n"
        body += f"\nUltimately, the best choice depends on your specific needs, budget, and preferences."

    elif model == "claude":
        body = "\n\n"
        for b in mentioned_comps:
            if b == brand:
                body += f"• {_build_brand_snippet(brand, category, sentiment, model)}\n\n"
            else:
                body += f"• {b} is another option in the {category} space that's been well-received, particularly for its specific strengths in serving {audience}.\n\n"
        body += f"I'd recommend trying a few options if possible, as personal preference plays a significant role in {category} satisfaction."

    elif model == "gemini":
        body = "\n"
        for b in mentioned_comps:
            if b == brand:
                body += f"• {_build_brand_snippet(brand, category, sentiment, model)}\n"
            else:
                body += f"• {b} — Trending {category} choice. Highly rated.\n"

    elif model == "ollama":
        body = "\n\n"
        for i, b in enumerate(mentioned_comps):
            if b == brand:
                body += f"- {_build_brand_snippet(brand, category, sentiment, model)}\n"
            else:
                body += f"- {b}: A notable {category} option that users have found satisfactory.\n"
        body += f"\nNote: Rankings may vary by individual use case and specific requirements for {audience}."

    return {
        "text": intro + body,
        "mentioned_brands": mentioned_comps,
    }


def generate_all_responses(
    query: str,
    query_type: str,
    brand: str,
    category: str,
    audience: str,
    competitors: List[str],
    rng: SeededRandom,
) -> Tuple[Dict[str, Dict], Dict[str, bool], float]:
    """
    Generate responses from all 4 AI models for a single query.
    Returns (responses_dict, presence_dict, authority).
    """
    authority = estimate_brand_authority(brand, category, rng)
    models = ["chatgpt", "claude", "gemini", "ollama"]
    presence = {}
    responses = {}

    for model in models:
        mentioned = should_mention_brand(authority, model, query_type, rng)
        presence[model] = mentioned
        responses[model] = generate_simulated_response(
            query, brand, category, audience, competitors, mentioned, model, rng
        )

    return responses, presence, authority
