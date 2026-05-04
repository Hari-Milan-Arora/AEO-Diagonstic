/* AEO Components — Modular UI renderers */
const AEOComponents = (() => {
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function fmt(text) { return esc(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
  function scoreClass(v) { return v >= 7 ? 'high' : v >= 4 ? 'medium' : 'low'; }
  function probClass(v) { const n = parseInt(v); return n >= 60 ? 'high' : n >= 30 ? 'medium' : 'low'; }

  function renderQueryCards(container, results) {
    container.innerHTML = '';
    results.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = 'query-card';
      card.innerHTML = `
        <div class="query-card-header" onclick="this.parentElement.classList.toggle('expanded')">
          <div style="display:flex;align-items:center;flex:1;min-width:0">
            <span class="query-number">Q${i + 1}</span>
            <h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.query)}</h3>
          </div>
          <span class="mention-prob ${probClass(r.ai_mention_probability)}">${r.ai_mention_probability}</span>
          <span class="chevron" style="margin-left:0.75rem">▼</span>
        </div>
        <div class="query-card-body">
          <div class="ai-responses-grid">
            ${aiCard('ChatGPT', 'chatgpt', r.responses.chatgpt, r.brand_presence.chatgpt)}
            ${aiCard('Claude', 'claude', r.responses.claude, r.brand_presence.claude)}
            ${aiCard('Gemini', 'gemini', r.responses.gemini, r.brand_presence.gemini)}
            ${aiCard('Ollama', 'ollama', r.responses.ollama, r.brand_presence.ollama)}
          </div>
          <div class="consensus-card">
            <span class="consensus-badge">🤝 Consensus ${r.brand_presence.consensus ? '✓' : '✗'}</span>
            <div class="response-text">${fmt(r.responses.consensus)}</div>
          </div>
          <div class="scores-row">
            ${pill('Visibility', r.scores.visibility)}${pill('Authority', r.scores.authority)}
            ${pill('Relevance', r.scores.relevance)}${pill('Trust', r.scores.trust)}
            <div class="score-pill"><span class="score-label">Position:</span><span style="color:var(--text-primary);font-weight:600">${r.position}</span></div>
            <div class="score-pill"><span class="score-label">Sentiment:</span><span style="color:${r.sentiment === 'Positive' ? 'var(--success)' : r.sentiment === 'Negative' ? 'var(--danger)' : 'var(--text-secondary)'};font-weight:600">${r.sentiment}</span></div>
          </div>
          <div class="insight-box"><strong>Insight:</strong> ${esc(r.insight)}</div>
          <div class="insight-box" style="border-left-color:var(--accent-3);margin-top:0.75rem"><strong>Recommendation:</strong> ${esc(r.recommendations)}</div>
        </div>`;
      container.appendChild(card);
    });
  }

  function aiCard(name, cls, text, present) {
    return `<div class="ai-response-card"><span class="ai-badge ${cls}">${name}</span>
      <span class="presence-indicator ${present ? 'present' : 'absent'}">${present ? '✓ Found' : '✗ Absent'}</span>
      <div class="response-text">${fmt(text)}</div></div>`;
  }

  function pill(label, value) {
    return `<div class="score-pill"><span class="score-label">${label}:</span><span class="score-value ${scoreClass(value)}">${value}/10</span></div>`;
  }

  function renderAnalysis(panel, agg) {
    const wkHTML = agg.weaknesses.length > 0
      ? agg.weaknesses.map(w => `<li><span class="sw-icon" style="color:var(--danger)">✗</span>${esc(w)}</li>`).join('')
      : '<li style="color:var(--text-muted)"><span class="sw-icon" style="color:var(--success)">✓</span>No significant weaknesses identified</li>';
    const stHTML = agg.strengths.length > 0
      ? agg.strengths.map(s => `<li><span class="sw-icon" style="color:var(--success)">✓</span>${esc(s)}</li>`).join('')
      : '<li style="color:var(--text-muted)">No clear strengths detected</li>';
    const perAI = agg.per_ai_mention || {};

    panel.innerHTML = `
      <h2 style="margin-bottom:1.5rem;font-size:1.3rem">📊 Aggregated Analysis</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${agg.overall_visibility}</div><div class="stat-label">Overall Visibility (0-100)</div></div>
        <div class="stat-card"><div class="stat-value">${agg.mention_rate}%</div><div class="stat-label">Overall Mention Rate</div></div>
        <div class="stat-card"><div class="stat-value">${agg.consensus_mention_rate}%</div><div class="stat-label">Consensus Mention Rate</div></div>
        <div class="stat-card"><div class="stat-value">${(agg.avg_scores || {}).visibility || 0}</div><div class="stat-label">Avg Visibility</div></div>
        <div class="stat-card"><div class="stat-value">${(agg.avg_scores || {}).authority || 0}</div><div class="stat-label">Avg Authority</div></div>
        <div class="stat-card"><div class="stat-value">${(agg.avg_scores || {}).relevance || 0}</div><div class="stat-label">Avg Relevance</div></div>
        <div class="stat-card"><div class="stat-value">${(agg.avg_scores || {}).trust || 0}</div><div class="stat-label">Avg Trust</div></div>
        <div class="stat-card"><div class="stat-value">${Math.round(agg.consensus_strength || 0)}%</div><div class="stat-label">Consensus Strength</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-container"><h3>📊 Score Radar</h3><canvas id="radarChart"></canvas></div>
        <div class="chart-container"><h3>📈 Per-AI Mention Rate</h3><canvas id="barChart"></canvas></div>
        <div class="chart-container"><h3>🎯 Overall Visibility</h3><canvas id="gaugeChart"></canvas></div>
        <div class="chart-container"><h3>🏆 Competitor Dominance</h3><canvas id="compChart"></canvas></div>
      </div>
      <div class="sw-grid">
        <div class="sw-card"><h3>💪 Top Strengths</h3><ul>${stHTML}</ul></div>
        <div class="sw-card"><h3>⚠️ Key Weaknesses</h3><ul>${wkHTML}</ul></div>
      </div>`;
  }

  function drawAnalysisCharts(agg) {
    try {
      const scores = agg.avg_scores || {};
      const perAI = agg.per_ai_mention || {};
      const r = document.getElementById('radarChart');
      const b = document.getElementById('barChart');
      const g = document.getElementById('gaugeChart');
      const c = document.getElementById('compChart');
      if (r) AEOCharts.drawRadar(r, scores);
      if (b) AEOCharts.drawBarChart(b, [
        { label: 'ChatGPT', value: perAI.chatgpt || 0, color: AEOCharts.COLORS.chatgpt },
        { label: 'Claude', value: perAI.claude || 0, color: AEOCharts.COLORS.claude },
        { label: 'Gemini', value: perAI.gemini || 0, color: AEOCharts.COLORS.gemini },
        { label: 'Ollama', value: perAI.ollama || 0, color: AEOCharts.COLORS.ollama },
      ]);
      if (g) AEOCharts.drawGauge(g, agg.overall_visibility);
      if (c && (agg.top_competitors || []).length > 0) {
        const clrs = [AEOCharts.COLORS.accent1, AEOCharts.COLORS.accent2, AEOCharts.COLORS.accent3, AEOCharts.COLORS.chatgpt, AEOCharts.COLORS.claude];
        AEOCharts.drawHorizontalBars(c, agg.top_competitors.map((co, i) => ({ label: co.name, value: co.frequency, color: clrs[i % 5] })));
      }
    } catch (e) { console.warn('Chart error:', e); }
  }

  function renderGaps(panel, gaps, brand) {
    panel.innerHTML = `<h2 style="margin-bottom:1.5rem;font-size:1.3rem">🔍 Strategic Gap Analysis for ${esc(brand)}</h2>` +
      (gaps || []).map(g => `<div class="gap-section"><h3>🔸 ${esc(g.title)}</h3><div class="gap-item">${esc(g.detail)}</div></div>`).join('');
  }

  function renderPredictive(panel, pred) {
    const risk = (pred.competitor_dominance_risk || '').toLowerCase();
    const riskCls = risk.includes('critical') ? 'critical' : risk.includes('high') ? 'high' : risk.includes('moderate') ? 'moderate' : 'low';
    const trend = pred.trend_projection || {};

    panel.innerHTML = `
      <h2 style="margin-bottom:1.5rem;font-size:1.3rem">🔮 Predictive Insights</h2>
      <div class="predictive-grid">
        <div class="predict-card"><h3>📈 Future Ranking Probability</h3><div class="predict-value">${pred.future_ranking_probability || 0}%</div><p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">Predicted probability of appearing in AI answers</p></div>
        <div class="predict-card"><h3>⚡ Fastest Improving Queries</h3><ul class="trend-list">${(pred.fastest_improving_queries || []).map(q => `<li><span>${q}</span><span style="color:var(--success)">↑ High potential</span></li>`).join('')}</ul></div>
        <div class="predict-card"><h3>⚠️ Competitor Risk</h3><span class="risk-badge ${riskCls}">${riskCls.toUpperCase()}</span><p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.75rem">${esc(pred.competitor_dominance_risk || '')}</p></div>
        <div class="predict-card"><h3>📊 90-Day Trend</h3><canvas id="trendChart"></canvas></div>
      </div>
      <div class="predict-summary"><strong>Summary:</strong> ${esc(pred.summary || '')}</div>`;

    requestAnimationFrame(() => {
      const tc = document.getElementById('trendChart');
      if (tc && Object.keys(trend).length > 0) AEOCharts.drawTrendLine(tc, trend);
    });
  }

  function renderActionPlan(panel, plan) {
    if (!plan) { panel.innerHTML = '<p style="color:var(--text-muted)">No action plan generated.</p>'; return; }
    let html = '<h2 style="margin-bottom:1.5rem;font-size:1.3rem">🚀 30-Day AEO Improvement Roadmap</h2><div class="timeline">';
    [plan.week1, plan.week2, plan.advanced].forEach(week => {
      if (!week) return;
      html += `<div class="timeline-week"><h3>${esc(week.title)}</h3>`;
      (week.actions || []).forEach(a => {
        html += `<div class="action-item"><div class="action-title">${esc(a.title)}</div><div class="action-desc">${esc(a.desc)}</div><span class="impact-tag ${a.impact}">${a.impact} impact</span></div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    panel.innerHTML = html;
  }

  return { renderQueryCards, renderAnalysis, drawAnalysisCharts, renderGaps, renderPredictive, renderActionPlan };
})();
