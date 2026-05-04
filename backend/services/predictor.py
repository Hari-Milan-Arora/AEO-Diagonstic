"""
AEO Diagnostic Engine — Phase 9: Predictive Insight (ML Edge)
Predicts future performance trends based on current diagnostic data.
"""

from typing import Dict, List
from backend.models.schemas import AggregatedAnalysis, PredictiveInsight
from backend.utils.helpers import clamp, round1


def generate_predictions(
    aggregated: AggregatedAnalysis,
    results: List[Dict],
    brand: str,
    category: str,
) -> PredictiveInsight:
    """
    Generate predictive insights based on current diagnostic data.
    
    Predicts:
    - Future ranking probability in AI answers
    - Which query types will improve fastest
    - Risk of competitor dominance
    - Trend projection over next 90 days
    """
    avg = aggregated.avg_scores
    vis = avg.visibility
    auth = avg.authority
    rel = avg.relevance
    trust = avg.trust

    # ─── Future Ranking Probability ───
    # Based on current scores, estimate probability of ranking improvement
    current_composite = (vis + auth + rel + trust) / 4
    # Brands with mid scores have most room for growth
    growth_potential = 1.0 - abs(current_composite - 5) / 5
    future_prob = clamp(
        (current_composite * 8) + (growth_potential * 15) + aggregated.mention_rate * 0.3,
        5, 95
    )

    # ─── Fastest Improving Query Types ───
    type_scores: Dict[str, List[float]] = {}
    for r in results:
        qt = r.get("query_type", "unknown")
        s = r.get("scores", {})
        composite = (
            s.get("visibility", 0) + s.get("authority", 0) +
            s.get("relevance", 0) + s.get("trust", 0)
        ) / 4
        if qt not in type_scores:
            type_scores[qt] = []
        type_scores[qt].append(composite)

    # Types with moderate scores improve fastest (not too low, not already high)
    type_avg = {qt: sum(scores) / len(scores) for qt, scores in type_scores.items() if scores}
    # Best improvement potential = scores in 3-6 range
    type_improvement = {
        qt: (1.0 - abs(avg_score - 4.5) / 4.5) * 100
        for qt, avg_score in type_avg.items()
    }
    fastest = sorted(type_improvement.items(), key=lambda x: x[1], reverse=True)
    fastest_types = [qt for qt, _ in fastest[:3]]

    # ─── Competitor Dominance Risk ───
    if aggregated.best_competitor:
        comp_freq = aggregated.best_competitor.frequency
        if comp_freq > 80:
            risk = f"CRITICAL: {aggregated.best_competitor.name} dominates with {comp_freq}% coverage. Immediate content strategy needed."
        elif comp_freq > 60:
            risk = f"HIGH: {aggregated.best_competitor.name} has {comp_freq}% coverage. Active measures needed within 30 days."
        elif comp_freq > 40:
            risk = f"MODERATE: {aggregated.best_competitor.name} at {comp_freq}% coverage. Monitor and build competitive content."
        else:
            risk = f"LOW: Top competitor ({aggregated.best_competitor.name}) at {comp_freq}% coverage. Market is fragmented — opportunity to establish dominance."
    else:
        risk = "LOW: No dominant competitors detected. Strong opportunity to claim AI answer space."

    # ─── Trend Projection (30/60/90 days) ───
    # Simple linear projection based on current scores
    monthly_growth_rate = growth_potential * 0.12  # ~12% max monthly improvement
    current_vis = aggregated.overall_visibility

    trend = {
        "current": float(current_vis),
        "30_days": round1(clamp(current_vis * (1 + monthly_growth_rate), 0, 100)),
        "60_days": round1(clamp(current_vis * (1 + monthly_growth_rate * 1.8), 0, 100)),
        "90_days": round1(clamp(current_vis * (1 + monthly_growth_rate * 2.5), 0, 100)),
    }

    # ─── Summary ───
    if current_composite >= 7:
        summary = (
            f"{brand} is well-positioned in AI answer rankings. Focus on maintaining position "
            f"and expanding into new query clusters. Projected visibility: {trend['90_days']}% in 90 days."
        )
    elif current_composite >= 4:
        summary = (
            f"{brand} has moderate AI visibility with clear growth potential. "
            f"With targeted content optimization, expect improvement to {trend['90_days']}% visibility in 90 days. "
            f"Priority: {', '.join(fastest_types[:2])} query types."
        )
    else:
        summary = (
            f"{brand} has significant AI visibility gaps. Aggressive content strategy required. "
            f"Potential improvement to {trend['90_days']}% in 90 days with focused effort. "
            f"Critical action needed on {', '.join(fastest_types[:2])} queries."
        )

    return PredictiveInsight(
        future_ranking_probability=round(future_prob, 1),
        fastest_improving_queries=fastest_types,
        competitor_dominance_risk=risk,
        trend_projection=trend,
        summary=summary,
    )
