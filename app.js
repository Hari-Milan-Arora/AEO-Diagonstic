const AEOApp = (() => {
  let diagnosticData = null;
  let lastAggregated = null;
  let lastParams = null;
  let chartsRendered = false;

  function init() {
    document.getElementById('querySlider').addEventListener('input', e => {
      document.getElementById('sliderValue').textContent = e.target.value;
    });
    document.getElementById('diagnosticForm').addEventListener('submit', handleSubmit);
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const brand = document.getElementById('brandName').value.trim();
    const category = document.getElementById('category').value.trim();
    const audience = document.getElementById('audience').value.trim();
    const compsRaw = document.getElementById('competitors').value.trim();
    const count = parseInt(document.getElementById('querySlider').value);

    if(!brand || !category || !audience) return;

    const competitors = compsRaw ? compsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const params = {brand, category, audience, competitors, count};

    document.getElementById('runBtn').disabled = true;
    document.getElementById('runBtn').innerHTML = '⏳ Running Diagnostic...';
    showProgress();
    hideResults();
    chartsRendered = false;

    try {
      diagnosticData = await AEOEngine.runDiagnostic(params, updateProgress);
      lastAggregated = diagnosticData.aggregated;
      lastParams = params;
      renderResults(diagnosticData, params);
      showResults();
      switchTab('queries');
    } catch(err) {
      console.error(err);
      alert('Diagnostic failed: ' + err.message);
    } finally {
      document.getElementById('runBtn').disabled = false;
      document.getElementById('runBtn').innerHTML = '▶ Run Full Diagnostic';
      hideProgress();
    }
  }

  function showProgress() { document.getElementById('progressSection').classList.add('active'); }
  function hideProgress() { document.getElementById('progressSection').classList.remove('active'); }
  function showResults() { document.getElementById('resultsSection').classList.add('active'); }
  function hideResults() { document.getElementById('resultsSection').classList.remove('active'); }

  function updateProgress({phase, name, pct}) {
    document.getElementById('phaseName').textContent = `Phase ${phase}/9: ${name}`;
    document.getElementById('phasePct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===tabId));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id==='tab-'+tabId));

    // Render charts only when Analysis tab becomes visible
    if(tabId === 'analysis' && lastAggregated && !chartsRendered) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          drawAllCharts(lastAggregated);
          chartsRendered = true;
        });
      });
    }
  }

  function scoreClass(v) { return v >= 7 ? 'high' : v >= 4 ? 'medium' : 'low'; }
  function probClass(v) { const n=parseInt(v); return n>=60?'high':n>=30?'medium':'low'; }

  function renderResults(data, params) {
    renderQueryCards(data.results);
    renderAnalysisHTML(data.aggregated, params);
    renderGapAnalysis(data.gaps, params);
    renderActionPlan(data.actionPlan);
  }

  function renderQueryCards(results) {
    const container = document.getElementById('queryCards');
    container.innerHTML = '';
    results.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = 'query-card';
      card.innerHTML = `
        <div class="query-card-header" onclick="this.parentElement.classList.toggle('expanded')">
          <div style="display:flex;align-items:center;flex:1;min-width:0">
            <span class="query-number">Q${i+1}</span>
            <h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.query)}</h3>
          </div>
          <span class="mention-prob ${probClass(r.ai_mention_probability)}">${r.ai_mention_probability}</span>
          <span class="chevron" style="margin-left:0.75rem">▼</span>
        </div>
        <div class="query-card-body">
          <div class="ai-responses-grid">
            ${aiResponseCard('ChatGPT', 'chatgpt', r.responses.chatgpt, r.brand_presence.chatgpt)}
            ${aiResponseCard('Claude', 'claude', r.responses.claude, r.brand_presence.claude)}
            ${aiResponseCard('Gemini', 'gemini', r.responses.gemini, r.brand_presence.gemini)}
          </div>
          <div class="consensus-card">
            <span class="consensus-badge">🤝 Consensus ${r.brand_presence.consensus ? '✓' : '✗'}</span>
            <div class="response-text">${formatResponse(r.responses.consensus)}</div>
          </div>
          <div class="scores-row">
            ${scorePill('Visibility', r.scores.visibility)}
            ${scorePill('Authority', r.scores.authority)}
            ${scorePill('Relevance', r.scores.relevance)}
            ${scorePill('Trust', r.scores.trust)}
            <div class="score-pill"><span class="score-label">Position:</span><span style="color:var(--text-primary);font-weight:600">${r.position}</span></div>
            <div class="score-pill"><span class="score-label">Sentiment:</span><span style="color:${r.sentiment==='Positive'?'var(--success)':r.sentiment==='Negative'?'var(--danger)':'var(--text-secondary)'};font-weight:600">${r.sentiment}</span></div>
          </div>
          <div class="insight-box"><strong>Insight:</strong> ${esc(r.insight)}</div>
          <div class="insight-box" style="border-left-color:var(--accent-3);margin-top:0.75rem"><strong>Recommendation:</strong> ${esc(r.recommendations)}</div>
        </div>`;
      container.appendChild(card);
    });
  }

  function aiResponseCard(name, cls, text, present) {
    return `<div class="ai-response-card">
      <span class="ai-badge ${cls}">${name}</span>
      <span class="presence-indicator ${present?'present':'absent'}">${present?'✓ Found':'✗ Absent'}</span>
      <div class="response-text">${formatResponse(text)}</div>
    </div>`;
  }

  function scorePill(label, value) {
    return `<div class="score-pill"><span class="score-label">${label}:</span><span class="score-value ${scoreClass(value)}">${value}/10</span></div>`;
  }

  function formatResponse(text) {
    return esc(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  // Render only HTML structure for Analysis tab (no charts yet)
  function renderAnalysisHTML(agg, params) {
    const weaknessHTML = agg.weaknesses.length > 0
      ? agg.weaknesses.map(w=>`<li><span class="sw-icon" style="color:var(--danger)">✗</span>${esc(w)}</li>`).join('')
      : '<li style="color:var(--text-muted)"><span class="sw-icon" style="color:var(--success)">✓</span>No significant weaknesses identified — strong AEO performance</li>';

    const strengthHTML = agg.strengths.length > 0
      ? agg.strengths.map(s=>`<li><span class="sw-icon" style="color:var(--success)">✓</span>${esc(s)}</li>`).join('')
      : '<li style="color:var(--text-muted)">No clear strengths detected — brand needs significant AEO investment</li>';

    const panel = document.getElementById('tab-analysis');
    panel.innerHTML = `
      <h2 style="margin-bottom:1.5rem;font-size:1.3rem">📊 Aggregated Analysis</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${agg.overallVisibility}</div><div class="stat-label">Overall Visibility (0-100)</div></div>
        <div class="stat-card"><div class="stat-value">${agg.mentionRate}%</div><div class="stat-label">Overall Mention Rate</div></div>
        <div class="stat-card"><div class="stat-value">${agg.consensusMentionRate}%</div><div class="stat-label">Consensus Mention Rate</div></div>
        <div class="stat-card"><div class="stat-value">${agg.avgScores.visibility}</div><div class="stat-label">Avg Visibility Score</div></div>
        <div class="stat-card"><div class="stat-value">${agg.avgScores.authority}</div><div class="stat-label">Avg Authority Score</div></div>
        <div class="stat-card"><div class="stat-value">${agg.avgScores.relevance}</div><div class="stat-label">Avg Relevance Score</div></div>
        <div class="stat-card"><div class="stat-value">${agg.avgScores.trust}</div><div class="stat-label">Avg Trust Score</div></div>
        <div class="stat-card"><div class="stat-value">${agg.perAIMention.chatgpt}%</div><div class="stat-label">ChatGPT Mention Rate</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-container"><h3>📊 Score Radar</h3><canvas id="radarChart"></canvas></div>
        <div class="chart-container"><h3>📈 Per-AI Mention Rate</h3><canvas id="barChart"></canvas></div>
        <div class="chart-container"><h3>🎯 Overall Visibility</h3><canvas id="gaugeChart"></canvas></div>
        <div class="chart-container"><h3>🏆 Competitor Dominance</h3><canvas id="compChart"></canvas></div>
      </div>
      <div class="sw-grid">
        <div class="sw-card"><h3>💪 Top Strengths</h3><ul>${strengthHTML}</ul></div>
        <div class="sw-card"><h3>⚠️ Key Weaknesses</h3><ul>${weaknessHTML}</ul></div>
      </div>`;
  }

  // Draw charts separately — called only when Analysis tab is visible
  function drawAllCharts(agg) {
    try {
      const radar = document.getElementById('radarChart');
      const bar = document.getElementById('barChart');
      const gauge = document.getElementById('gaugeChart');
      const comp = document.getElementById('compChart');

      if(radar) AEOCharts.drawRadar(radar, agg.avgScores);
      if(bar) AEOCharts.drawBarChart(bar, [
        {label:'ChatGPT', value:agg.perAIMention.chatgpt, color:AEOCharts.COLORS.chatgpt},
        {label:'Claude', value:agg.perAIMention.claude, color:AEOCharts.COLORS.claude},
        {label:'Gemini', value:agg.perAIMention.gemini, color:AEOCharts.COLORS.gemini}
      ]);
      if(gauge) AEOCharts.drawGauge(gauge, agg.overallVisibility);
      if(comp && agg.topCompetitors.length > 0) {
        AEOCharts.drawHorizontalBars(comp,
          agg.topCompetitors.map((c,i)=>({label:c.name, value:c.frequency, color:[AEOCharts.COLORS.accent1,AEOCharts.COLORS.accent2,AEOCharts.COLORS.accent3,AEOCharts.COLORS.chatgpt,AEOCharts.COLORS.claude][i%5]}))
        );
      }
    } catch(e) { console.warn('Chart render error:', e); }
  }

  function renderGapAnalysis(gaps, params) {
    const panel = document.getElementById('tab-gaps');
    panel.innerHTML = `<h2 style="margin-bottom:1.5rem;font-size:1.3rem">🔍 Strategic Gap Analysis for ${esc(params.brand)}</h2>` +
      gaps.map(g => `<div class="gap-section"><h3>🔸 ${esc(g.title)}</h3><div class="gap-item">${esc(g.detail)}</div></div>`).join('');
  }

  function renderActionPlan(plan) {
    const panel = document.getElementById('tab-plan');
    panel.innerHTML = '<h2 style="margin-bottom:1.5rem;font-size:1.3rem">🚀 30-Day AEO Improvement Roadmap</h2><div class="timeline">';
    [plan.week1, plan.week2, plan.advanced].forEach(week => {
      panel.innerHTML += `<div class="timeline-week"><h3>${esc(week.title)}</h3>` +
        week.actions.map(a => `<div class="action-item">
          <div class="action-title">${esc(a.title)}</div>
          <div class="action-desc">${esc(a.desc)}</div>
          <span class="impact-tag ${a.impact}">${a.impact} impact</span>
        </div>`).join('') + '</div>';
    });
    panel.innerHTML += '</div>';
  }

  function exportJSON() {
    if(!diagnosticData) return alert('Run a diagnostic first.');
    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aeo-diagnostic-report.json'; a.click();
    URL.revokeObjectURL(url);
  }

  return {init};
})();

document.addEventListener('DOMContentLoaded', AEOApp.init);
