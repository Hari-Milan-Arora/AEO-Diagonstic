"""
AEO Diagnostic Engine — Phase 1: Query Generation
Generates N high-intent queries across 4 types:
best, comparison, problem-solving, and conversational long-tail.
"""

from typing import List, Dict
from backend.utils.helpers import hash_str, SeededRandom


QUERY_TEMPLATES = {
    "best": [
        "What is the best {category} for {audience}?",
        "Top {category} recommendations for {audience}",
        "Best {category} to buy in 2025 for {audience}",
        "What {category} do experts recommend for {audience}?",
        "Most popular {category} among {audience}",
        "Which {category} is #1 for {audience} right now?",
        "What are the highest-rated {category} for {audience}?",
    ],
    "comparison": [
        "{brand} vs {competitor} — which is better for {audience}?",
        "How does {brand} compare to {competitor} in {category}?",
        "{brand} or {competitor} for {audience}?",
        "Comparing top {category} brands: {brand} vs {competitor}",
        "{brand} vs {competitor}: honest comparison for {category}",
        "Should I choose {brand} or {competitor} for {audience} use?",
    ],
    "problem": [
        "How to choose the right {category} for {audience}?",
        "What should {audience} look for in a {category}?",
        "Common problems with {category} and how to solve them",
        "Why is my {category} not working for {audience} needs?",
        "How to get the most out of your {category}",
        "What mistakes do {audience} make when choosing {category}?",
        "Troubleshooting {category} issues for {audience}",
    ],
    "longtail": [
        "I'm a {audience_desc} looking for a good {category}, any suggestions?",
        "Can someone recommend a {category} that works well for {audience}?",
        "I've been researching {category} options for {audience}, what should I consider?",
        "What {category} would you suggest for someone who is {audience_desc}?",
        "Is it worth investing in premium {category} for {audience}?",
        "As a {audience_desc}, which {category} gives the best value?",
        "Help me decide on a {category} — I'm {audience_desc} with specific needs",
    ],
}

QUERY_TYPES = ["best", "comparison", "problem", "longtail"]


def generate_queries(
    brand: str,
    category: str,
    audience: str,
    competitors: List[str],
    count: int = 15,
) -> List[Dict]:
    """
    Generate N high-intent queries distributed across 4 types.
    Returns list of {query, type, index} dicts.
    """
    rng = SeededRandom(hash_str(brand + category))
    queries = []
    comp_list = competitors if competitors else ["Alternative A", "Alternative B"]
    audience_desc = audience.lower()

    for i in range(count):
        qtype = QUERY_TYPES[i % len(QUERY_TYPES)]
        templates = QUERY_TEMPLATES[qtype]
        tpl = templates[i % len(templates)]
        comp = comp_list[i % len(comp_list)]

        query_text = (
            tpl.replace("{brand}", brand)
            .replace("{category}", category)
            .replace("{audience}", audience)
            .replace("{competitor}", comp)
            .replace("{audience_desc}", audience_desc)
        )

        queries.append({
            "query": query_text,
            "type": qtype,
            "index": i,
        })

    return queries
