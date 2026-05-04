# 🔍 AEO Diagnostic Engine

**Multi-AI Brand Visibility Analyzer** — Evaluate how your brand performs across AI-generated answers.

## Features

- **Multi-AI Simulation**: Simulates ChatGPT, Claude, and Gemini responses independently
- **Cross-AI Consensus Engine**: Merges responses to produce weighted consensus answers
- **9-Phase Pipeline**: Query generation → AI simulation → Consensus → Evaluation → Scoring → Output → Aggregation → Gap Analysis → Action Plan
- **Per-AI Brand Tracking**: See exactly which AI systems mention your brand (✓/✗)
- **Scoring System**: Visibility, Authority, Relevance, Trust scores (0–10) per query
- **Interactive Charts**: Radar, bar, gauge, and horizontal bar charts (Canvas-based, zero dependencies)
- **30-Day Action Plan**: Prioritized roadmap with impact ratings
- **JSON Export**: Download complete diagnostic report

## Usage

1. Open `index.html` in any modern browser
2. Enter your brand name, category, target audience, and optional competitors
3. Set the number of queries (5–30)
4. Click **Run Full Diagnostic**
5. Explore results across 4 tabs: Per-Query | Analysis | Gap Analysis | 30-Day Plan

## Tech Stack

- Pure HTML/CSS/JS — zero dependencies
- Canvas API for charts
- Glassmorphic dark UI with Inter + Outfit fonts
- Fully responsive (mobile → desktop)

## File Structure

```
├── index.html    — Main page
├── index.css     — Design system & styles
├── app.js        — UI orchestrator
├── engine.js     — 9-phase AEO engine
├── charts.js     — Canvas chart library
├── AGENTS.md     — System contract
└── README.md     — This file
```