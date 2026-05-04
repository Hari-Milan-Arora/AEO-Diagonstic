"""
AEO Diagnostic Engine — Phase 8: Aggregated ML Analysis
Computes overall metrics across all queries.
"""

from typing import Dict, List
from backend.utils.helpers import round1, pct
from backend.models.schemas import (
    AggregatedAnalysis, PerAIMention, CompetitorEntry, MLScores,
)


def aggregate_results(
    results: List[Dict],
    brand: str,
    category: str,
) -> AggregatedAnalysis:
    """
    Aggregate all per-query results into overall metrics.
    
    Computes:
    - Overall Visibility Score (0–100)
    - Per-AI mention rates
    - Consensus strength score
    - Average ML scores
    - Top 3 strengths, Top 5 weaknesses
    - Dominant competitors, weak query clusters
    """
    n = len(results)
    if n == 0:
        return AggregatedAnalysis()

    # Accumulate scores
    total_scores = {"visibility": 0, "authority": 0, "relevance": 0, "trust": 0}
    total_mention_prob = 0
    ai_mentions = {"chatgpt": 0, "claude": 0, "gemini": 0, "ollama": 0, "consensus": 0}
    query_type_failures: Dict[str, int] = {}
    comp_freq: Dict[str, int] = {}

    for r in results:
        scores = r.get("scores", {})
        for k in total_scores:
            total_scores[k] += scores.get(k, 0)

        prob_str = r.get("ai_mention_probability", "0%")
        total_mention_prob += int(prob_str.replace("%", ""))

        presence = r.get("brand_presence", {})
        for m in ["chatgpt", "claude", "gemini", "ollama", "consensus"]:
            if presence.get(m, False):
                ai_mentions[m] += 1

        # Track query types with zero brand presence
        ai_models = ["chatgpt", "claude", "gemini", "ollama"]
        if not any(presence.get(m, False) for m in ai_models):
            qt = r.get("query_type", "unknown")
            query_type_failures[qt] = query_type_failures.get(qt, 0) + 1

        for c in r.get("competitors", []):
            comp_freq[c] = comp_freq.get(c, 0) + 1

    # Average scores
    avg_scores = MLScores(
        visibility=round1(total_scores["visibility"] / n),
        authority=round1(total_scores["authority"] / n),
        relevance=round1(total_scores["relevance"] / n),
        trust=round1(total_scores["trust"] / n),
    )

    overall_visibility = round(avg_scores.visibility * 10)

    # Mention rates
    ai_model_count = 4  # chatgpt, claude, gemini, ollama
    total_slots = n * ai_model_count
    mention_rate = pct(
        ai_mentions["chatgpt"] + ai_mentions["claude"] + ai_mentions["gemini"] + ai_mentions["ollama"],
        total_slots
    )

    per_ai = PerAIMention(
        chatgpt=pct(ai_mentions["chatgpt"], n),
        claude=pct(ai_mentions["claude"], n),
        gemini=pct(ai_mentions["gemini"], n),
        ollama=pct(ai_mentions["ollama"], n),
    )

    consensus_mention_rate = pct(ai_mentions["consensus"], n)

    # Consensus strength (average)
    consensus_strength = round(
        sum(r.get("consensus_strength", 0) for r in results) / n, 1
    )

    # Top competitors
    sorted_comps = sorted(comp_freq.items(), key=lambda x: x[1], reverse=True)
    top_comps = [
        CompetitorEntry(name=name, frequency=pct(count, n))
        for name, count in sorted_comps[:5]
    ]

    # Weak query clusters
    weak_clusters = list(query_type_failures.keys())

    # ─── Strengths & Weaknesses ───
    strengths = []
    weaknesses = []

    if avg_scores.visibility >= 6:
        strengths.append(f"Strong overall visibility score ({avg_scores.visibility}/10) across AI systems")
    if avg_scores.authority >= 6:
        strengths.append(f"High authority recognition ({avg_scores.authority}/10) — brand is perceived as credible")
    if avg_scores.trust >= 6:
        strengths.append(f"Good trust signals ({avg_scores.trust}/10) — positive sentiment dominates")
    if per_ai.chatgpt > 60:
        strengths.append(f"Strong presence in ChatGPT responses ({per_ai.chatgpt}% mention rate)")
    if per_ai.gemini > 60:
        strengths.append(f"High visibility in Gemini responses ({per_ai.gemini}% mention rate)")
    if per_ai.ollama > 60:
        strengths.append(f"Strong Ollama/local LLM presence ({per_ai.ollama}% mention rate)")
    if consensus_mention_rate > 50:
        strengths.append(f"Appears in consensus answers {consensus_mention_rate}% of the time")
    if not strengths:
        strengths.append("Brand has room for significant improvement across all AI visibility metrics")

    if avg_scores.visibility < 5:
        weaknesses.append(f"Low visibility score ({avg_scores.visibility}/10) — brand is not prominent in AI answers")
    if avg_scores.authority < 5:
        weaknesses.append(f"Weak authority signals ({avg_scores.authority}/10) — AI systems don't consistently recognize the brand")
    if avg_scores.relevance < 5:
        weaknesses.append(f"Low relevance score ({avg_scores.relevance}/10) — brand-category association is weak")
    if avg_scores.trust < 5:
        weaknesses.append(f"Trust deficit ({avg_scores.trust}/10) — insufficient credibility signals")
    if per_ai.claude < 40:
        weaknesses.append(f"Weak presence in Claude responses ({per_ai.claude}% mention rate) — needs stronger safety/trust signals")
    if per_ai.chatgpt < 40:
        weaknesses.append(f"Low ChatGPT visibility ({per_ai.chatgpt}%) — content may lack structured clarity")
    if per_ai.gemini < 40:
        weaknesses.append(f"Poor Gemini presence ({per_ai.gemini}%) — brand may not appear in trending/search data")
    if per_ai.ollama < 40:
        weaknesses.append(f"Low Ollama/local model presence ({per_ai.ollama}%) — brand data may be sparse in open training sets")
    if consensus_mention_rate < 40:
        weaknesses.append(f"Low consensus mention rate ({consensus_mention_rate}%) — brand not consistently recommended")
    if query_type_failures:
        weaknesses.append(f"Fails in query types: {', '.join(query_type_failures.keys())}")

    # Find worst AI
    ai_rates = {
        "chatgpt": per_ai.chatgpt,
        "claude": per_ai.claude,
        "gemini": per_ai.gemini,
        "ollama": per_ai.ollama,
    }
    worst_ai_name = min(ai_rates, key=ai_rates.get)
    worst_ai = {"name": worst_ai_name, "rate": ai_rates[worst_ai_name]}

    best_comp = top_comps[0] if top_comps else None

    return AggregatedAnalysis(
        overall_visibility=overall_visibility,
        mention_rate=mention_rate,
        consensus_mention_rate=consensus_mention_rate,
        consensus_strength=consensus_strength,
        per_ai_mention=per_ai,
        avg_scores=avg_scores,
        strengths=strengths[:3],
        weaknesses=weaknesses[:5],
        top_competitors=top_comps,
        query_type_failures=query_type_failures,
        weak_query_clusters=weak_clusters,
        worst_ai=worst_ai,
        best_competitor=best_comp,
    )
