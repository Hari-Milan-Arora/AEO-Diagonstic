"""
AEO Diagnostic Engine — Phase 10: 30-Day Action Plan Generator
Produces a prioritized roadmap with impact ratings.
"""

from typing import Dict, List
from backend.models.schemas import ActionPlan, ActionWeek, ActionItem, AggregatedAnalysis


def generate_action_plan(
    aggregated: AggregatedAnalysis,
    gaps: List[Dict],
    brand: str,
    category: str,
    audience: str,
) -> ActionPlan:
    """
    Generate a high-impact 30-day roadmap.
    
    Week 1–2: Content fixes, structured FAQ, semantic optimization
    Week 3–4: Authority building, AI citations & mentions
    Advanced: AI-first content strategy, multi-platform reinforcement
    """
    top_comp_names = ", ".join(c.name for c in aggregated.top_competitors[:3]) or "top competitors"
    worst_ai = aggregated.worst_ai
    worst_ai_name = worst_ai.get("name", "claude") if worst_ai else "claude"
    worst_ai_rate = worst_ai.get("rate", 0) if worst_ai else 0

    week1 = ActionWeek(
        title="Week 1–2: Quick Wins & Content Fixes",
        actions=[
            ActionItem(
                title=f'Create "{category} for {audience}" FAQ page',
                desc=(
                    f"Build a comprehensive FAQ addressing the top 10 questions "
                    f"{audience} ask about {category}. Use schema markup for FAQ "
                    f"structured data. Target both informational and transactional intent."
                ),
                impact="high",
            ),
            ActionItem(
                title="Optimize brand entity markup",
                desc=(
                    f"Add Organization and Product schema markup to {brand}'s website. "
                    f"Ensure all key pages have structured data that AI systems can parse. "
                    f"Include name, description, reviews, and category attributes."
                ),
                impact="high",
            ),
            ActionItem(
                title=f'Publish "{brand} vs competitors" comparison guide',
                desc=(
                    f"Create honest, data-driven comparison content for {brand} vs "
                    f"{top_comp_names}. AI systems heavily weight comparison content. "
                    f"Include tables, pros/cons, and use-case-specific recommendations."
                ),
                impact="high",
            ),
            ActionItem(
                title="Audit and improve meta descriptions",
                desc=(
                    "Rewrite meta descriptions across all key pages to be concise, "
                    "keyword-rich, and aligned with AI search intent patterns. "
                    "Focus on natural language that matches how users ask AI questions."
                ),
                impact="medium",
            ),
            ActionItem(
                title="Create semantic content clusters",
                desc=(
                    f"Build interconnected content around core {category} topics. "
                    f"Each cluster should cover a subtopic comprehensively with internal "
                    f"linking. This strengthens topical authority in AI knowledge graphs."
                ),
                impact="medium",
            ),
        ],
    )

    week2 = ActionWeek(
        title="Week 3–4: Authority Building",
        actions=[
            ActionItem(
                title="Secure expert mentions and reviews",
                desc=(
                    f"Reach out to industry experts and review platforms in {category}. "
                    f"Each authoritative mention strengthens AI model confidence in "
                    f"recommending {brand}. Target 5-10 expert citations."
                ),
                impact="high",
            ),
            ActionItem(
                title="Build high-quality backlinks",
                desc=(
                    f"Target authoritative sites in the {category} space for guest posts, "
                    f"features, and citations. Focus on quality over quantity. "
                    f"Prioritize sites that AI systems reference."
                ),
                impact="high",
            ),
            ActionItem(
                title="Launch user testimonial campaign",
                desc=(
                    f"Collect and publish authentic user testimonials from {audience}. "
                    f"Feature them prominently with review schema markup. "
                    f"Aggregate ratings on Google, Trustpilot, and industry-specific platforms."
                ),
                impact="medium",
            ),
            ActionItem(
                title="Create data-driven industry content",
                desc=(
                    f"Publish original research or data about {category} trends. "
                    f"AI models prioritize brands that produce authoritative, cited content. "
                    f"Include charts, statistics, and downloadable resources."
                ),
                impact="medium",
            ),
            ActionItem(
                title="Optimize for voice and conversational queries",
                desc=(
                    f"Restructure key pages to answer questions in a conversational format. "
                    f"Use question-answer patterns that AI models can extract directly."
                ),
                impact="medium",
            ),
        ],
    )

    advanced = ActionWeek(
        title="Advanced: AI-First Content Strategy",
        actions=[
            ActionItem(
                title="Implement conversational content patterns",
                desc=(
                    f'Create content that directly answers conversational queries like '
                    f'"what {category} should I choose for..." — this is how AI systems '
                    f'extract answers. Use natural language and direct answer formats.'
                ),
                impact="high",
            ),
            ActionItem(
                title="Build multi-platform presence",
                desc=(
                    f"Ensure {brand} has consistent, optimized presence across platforms "
                    f"AI models reference: Wikipedia, Reddit, industry forums, review sites, "
                    f"social media, and Stack Overflow/Quora where applicable."
                ),
                impact="high",
            ),
            ActionItem(
                title=f"Target weak AI: {worst_ai_name.capitalize()}",
                desc=_get_ai_specific_advice(worst_ai_name, brand, category),
                impact="medium",
            ),
            ActionItem(
                title="Develop AI citation strategy",
                desc=(
                    f"Create content specifically designed to be cited by AI systems: "
                    f"definitive guides, glossaries, industry standards, and benchmark data "
                    f"for {category}. Position {brand} as the authoritative source."
                ),
                impact="high",
            ),
            ActionItem(
                title="Monitor and iterate monthly",
                desc=(
                    "Run AEO diagnostics monthly to track progress. Adjust strategy "
                    "based on which AI systems show improvement and which remain weak. "
                    "Track competitor movement and adapt accordingly."
                ),
                impact="medium",
            ),
        ],
    )

    return ActionPlan(week1=week1, week2=week2, advanced=advanced)


def _get_ai_specific_advice(ai_name: str, brand: str, category: str) -> str:
    """Get AI-model-specific optimization advice."""
    advice = {
        "claude": (
            f"Create content specifically optimized for Claude's known preferences: "
            f"nuanced, safety-aware, detailed explanations with balanced perspectives. "
            f"Include disclaimers, caveats, and thoughtful analysis about {category}."
        ),
        "gemini": (
            f"Optimize for Gemini's search-driven approach: concise, search-optimized content "
            f"with trending signals. Ensure {brand} appears in Google Knowledge Graph "
            f"and has fresh, regularly updated content about {category}."
        ),
        "chatgpt": (
            f"Improve ChatGPT visibility with structured, balanced, well-reasoned content. "
            f"Use clear formatting (numbered lists, bold key points) and provide "
            f"comprehensive but accessible information about {brand} in {category}."
        ),
        "ollama": (
            f"Strengthen open-source model visibility by ensuring {brand} data appears in "
            f"commonly used training datasets: Wikipedia, Common Crawl, Reddit discussions. "
            f"Open-source models rely heavily on publicly available text corpora."
        ),
    }
    return advice.get(ai_name, advice["chatgpt"])


def generate_gap_analysis(
    aggregated: AggregatedAnalysis,
    brand: str,
    category: str,
    audience: str,
) -> List[Dict]:
    """Generate strategic gap analysis from aggregated data."""
    gaps = []
    worst_ai = aggregated.worst_ai or {}
    worst_ai_name = worst_ai.get("name", "claude")
    worst_ai_rate = worst_ai.get("rate", 0)

    gaps.append({
        "title": "Competitor Dominance",
        "detail": (
            f"{aggregated.top_competitors[0].name} dominates with "
            f"{aggregated.top_competitors[0].frequency}% query coverage. "
            f"{brand} must close this gap by creating comparison content and "
            f"building more authoritative brand signals."
        ) if aggregated.top_competitors else (
            f"Even without strong named competitors, {brand} struggles to appear in "
            f"AI answers — indicating a fundamental content and authority gap."
        ),
    })

    gaps.append({
        "title": f"Weakest AI: {worst_ai_name.capitalize()}",
        "detail": (
            f"{brand} appears in only {worst_ai_rate}% of {worst_ai_name} responses. "
            f"This AI system likely penalizes the brand for "
            f"{'insufficient safety/trust signals and nuanced content' if worst_ai_name == 'claude' else 'lack of structured, search-optimized content and trending signals'}."
        ),
    })

    gaps.append({
        "title": "Content Depth Gap",
        "detail": (
            f"AI systems favor brands with comprehensive, well-structured content. "
            f"{brand} likely lacks in-depth guides, comparison articles, and expert-level "
            f'content for the "{category}" space targeting {audience}.'
        ),
    })

    gaps.append({
        "title": "Authority Mention Deficiency",
        "detail": (
            f"{brand} needs more third-party mentions, expert endorsements, and citations "
            f"from authoritative sources. AI systems weight external validation heavily "
            f"when deciding which brands to recommend."
        ),
    })

    gaps.append({
        "title": "Semantic Clarity Issues",
        "detail": (
            f'The brand\'s digital footprint may lack clear semantic associations with "{category}". '
            f"AI models need unambiguous signals connecting {brand} to the category through "
            f"structured data, clear product descriptions, and consistent messaging."
        ),
    })

    gaps.append({
        "title": "Review & Trust Indicators",
        "detail": (
            f"User reviews, ratings, testimonials, and case studies serve as critical trust signals. "
            f"{brand} should amplify its review presence across platforms to strengthen "
            f"AI model confidence."
        ),
    })

    gaps.append({
        "title": "Cross-Model Consistency Gap",
        "detail": (
            f"Brand presence varies across AI models, indicating inconsistent data representation. "
            f"{brand} needs a unified content strategy that serves all AI systems equally — "
            f"structured for ChatGPT, nuanced for Claude, search-optimized for Gemini, "
            f"and well-represented in open training data for Ollama."
        ),
    })

    return gaps
