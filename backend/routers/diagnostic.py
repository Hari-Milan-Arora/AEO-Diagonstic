"""
AEO Diagnostic Engine — API Router
Endpoints for running diagnostics and streaming progress.
"""

import uuid
import asyncio
import json
from typing import Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.models.schemas import (
    DiagnosticRequest, DiagnosticResponse, QueryResult,
    AIResponses, BrandPresence, MLScores, ProgressEvent,
)
from backend.services.query_generator import generate_queries
from backend.services.ai_layer import generate_all_responses
from backend.services.consensus import build_consensus
from backend.services.feature_extractor import extract_features
from backend.services.ml_scorer import compute_ml_scores
from backend.services.brand_analyzer import (
    generate_position, generate_sentiment,
    collect_competitors, generate_insight, generate_recommendation,
)
from backend.services.aggregator import aggregate_results
from backend.services.predictor import generate_predictions
from backend.services.action_planner import generate_action_plan, generate_gap_analysis
from backend.utils.helpers import hash_str, SeededRandom

router = APIRouter(prefix="/api/diagnostic", tags=["diagnostic"])

# In-memory store for results (stateless — no DB)
_results_store: Dict[str, DiagnosticResponse] = {}


@router.post("/run")
async def run_diagnostic(request: DiagnosticRequest):
    """
    Run a full 10-phase AEO diagnostic.
    Returns the complete result synchronously.
    """
    run_id = str(uuid.uuid4())[:8]

    try:
        result = await _execute_diagnostic(request, run_id)
        _results_store[run_id] = result
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-stream")
async def run_diagnostic_stream(request: DiagnosticRequest):
    """
    Run a full 10-phase AEO diagnostic with SSE progress streaming.
    Streams progress events, then sends the final result.
    """
    run_id = str(uuid.uuid4())[:8]

    async def event_generator():
        try:
            # Phase 1: Query Generation
            yield _sse_event(ProgressEvent(phase=1, name="Generating Queries", pct=5))
            await asyncio.sleep(0.1)

            queries = generate_queries(
                request.brand_name, request.category, request.audience,
                request.competitors, request.num_queries,
            )
            yield _sse_event(ProgressEvent(phase=1, name="Queries Generated", pct=10))

            rng = SeededRandom(hash_str(request.brand_name + request.category + request.audience))
            query_results = []

            # Phases 2-6: Process each query
            for i, q in enumerate(queries):
                phase = 2 + min(int(i / (len(queries) / 4)), 4)
                pct_val = 10 + int((i / len(queries)) * 55)
                yield _sse_event(ProgressEvent(
                    phase=phase,
                    name=f"Processing Query {i+1}/{len(queries)}",
                    pct=pct_val,
                    detail=q["query"][:60],
                ))
                await asyncio.sleep(0.05)

                result = _process_single_query(q, request, rng)
                query_results.append(result)

            # Phase 7: Structuring Output
            yield _sse_event(ProgressEvent(phase=7, name="Structuring Output", pct=70))
            await asyncio.sleep(0.1)

            # Phase 8: Aggregation
            yield _sse_event(ProgressEvent(phase=8, name="Aggregating Analysis", pct=78))
            await asyncio.sleep(0.1)

            results_dicts = [r.model_dump() for r in query_results]
            aggregated = aggregate_results(results_dicts, request.brand_name, request.category)

            # Phase 9: Predictive Insight
            yield _sse_event(ProgressEvent(phase=9, name="Generating Predictions", pct=88))
            await asyncio.sleep(0.1)

            predictive = generate_predictions(
                aggregated, results_dicts, request.brand_name, request.category,
            )

            # Phase 10: Action Plan
            yield _sse_event(ProgressEvent(phase=10, name="Building Action Plan", pct=92))
            await asyncio.sleep(0.1)

            gaps = generate_gap_analysis(
                aggregated, request.brand_name, request.category, request.audience,
            )
            action_plan = generate_action_plan(
                aggregated, gaps, request.brand_name, request.category, request.audience,
            )

            # Complete
            yield _sse_event(ProgressEvent(phase=10, name="Complete", pct=100))

            # Send final result
            response = DiagnosticResponse(
                run_id=run_id,
                brand_name=request.brand_name,
                category=request.category,
                audience=request.audience,
                mode="simulation",
                results=query_results,
                aggregated=aggregated,
                gaps=[{"title": g["title"], "detail": g["detail"]} for g in gaps],
                predictive=predictive,
                action_plan=action_plan,
            )

            _results_store[run_id] = response
            yield f"event: result\ndata: {json.dumps(response.model_dump(), default=str)}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/result/{run_id}")
async def get_result(run_id: str):
    """Get a previously computed diagnostic result."""
    if run_id not in _results_store:
        raise HTTPException(status_code=404, detail="Result not found")
    return _results_store[run_id].model_dump()


@router.get("/health")
async def health():
    return {"status": "ok", "mode": "simulation"}


async def _execute_diagnostic(request: DiagnosticRequest, run_id: str) -> DiagnosticResponse:
    """Execute the complete diagnostic pipeline without SSE streaming."""
    queries = generate_queries(
        request.brand_name,
        request.category,
        request.audience,
        request.competitors,
        request.num_queries,
    )

    rng = SeededRandom(hash_str(request.brand_name + request.category + request.audience))
    query_results = [
        _process_single_query(query_obj, request, rng)
        for query_obj in queries
    ]

    results_dicts = [r.model_dump() for r in query_results]
    aggregated = aggregate_results(results_dicts, request.brand_name, request.category)
    predictive = generate_predictions(
        aggregated,
        results_dicts,
        request.brand_name,
        request.category,
    )
    gaps = generate_gap_analysis(
        aggregated,
        request.brand_name,
        request.category,
        request.audience,
    )
    action_plan = generate_action_plan(
        aggregated,
        gaps,
        request.brand_name,
        request.category,
        request.audience,
    )

    return DiagnosticResponse(
        run_id=run_id,
        brand_name=request.brand_name,
        category=request.category,
        audience=request.audience,
        mode="simulation",
        results=query_results,
        aggregated=aggregated,
        gaps=[{"title": g["title"], "detail": g["detail"]} for g in gaps],
        predictive=predictive,
        action_plan=action_plan,
    )


def _process_single_query(query_obj: Dict, request: DiagnosticRequest, rng: SeededRandom) -> QueryResult:
    """Process a single query through phases 2-6."""
    brand = request.brand_name
    category = request.category
    audience = request.audience
    competitors = request.competitors

    # Phase 2: AI Responses
    responses, presence, authority = generate_all_responses(
        query_obj["query"], query_obj["type"],
        brand, category, audience, competitors, rng,
    )

    # Phase 3: Consensus
    consensus = build_consensus(responses, presence, brand, category, audience, rng)
    presence["consensus"] = consensus["brand_present"]

    # Phase 6: Brand Analysis
    any_mentioned = any(presence.get(m, False) for m in ["chatgpt", "claude", "gemini", "ollama"])
    position = generate_position(any_mentioned, rng)
    sentiment = generate_sentiment(any_mentioned, authority, rng)
    comps = collect_competitors(responses, consensus, brand)

    # Phase 4: Feature Extraction
    features = extract_features(
        query_obj["query"], brand, category, responses, presence, consensus,
    )

    # Phase 5: ML Scoring
    scores = compute_ml_scores(features, presence, authority)

    # Insight & Recommendation
    insight = generate_insight(brand, category, presence)
    recommendation = generate_recommendation(brand, category, audience, query_obj["query"], presence, position)

    return QueryResult(
        query=query_obj["query"],
        query_type=query_obj["type"],
        responses=AIResponses(
            chatgpt=responses["chatgpt"]["text"],
            claude=responses["claude"]["text"],
            gemini=responses["gemini"]["text"],
            ollama=responses["ollama"]["text"],
            consensus=consensus["text"],
        ),
        brand_presence=BrandPresence(
            chatgpt=presence.get("chatgpt", False),
            claude=presence.get("claude", False),
            gemini=presence.get("gemini", False),
            ollama=presence.get("ollama", False),
            consensus=presence.get("consensus", False),
        ),
        consensus_strength=consensus["consensus_strength"],
        position=position,
        sentiment=sentiment,
        competitors=comps,
        features=features["feature_scores"],
        scores=MLScores(
            visibility=scores["visibility"],
            authority=scores["authority"],
            relevance=scores["relevance"],
            trust=scores["trust"],
        ),
        ai_mention_probability=f"{scores['mention_probability']}%",
        insight=insight,
        recommendations=recommendation,
    )


def _sse_event(event: ProgressEvent) -> str:
    """Format a progress event as SSE."""
    data = json.dumps(event.model_dump())
    return f"event: progress\ndata: {data}\n\n"
