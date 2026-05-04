/* AEO App — Main Controller */
const AEOApp = (() => {
  let diagnosticData = null;
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
    checkBackend();
  }

  async function checkBackend() {
    const ok = await AEOApi.checkHealth();
    const el = document.getElementById('statusBackend');
    el.classList.toggle('active', ok);
    el.classList.toggle('simulated', !ok);
    ['statusChatGPT', 'statusClaude', 'statusGemini', 'statusOllama'].forEach(id => {
      document.getElementById(id).classList.add('simulated');
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const brand = document.getElementById('brandName').value.trim();
    const category = document.getElementById('category').value.trim();
    const audience = document.getElementById('audience').value.trim();
    const compsRaw = document.getElementById('competitors').value.trim();
    const count = parseInt(document.getElementById('querySlider').value);
    if (!brand || !category || !audience) return;

    const competitors = compsRaw ? compsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const params = { brand, category, audience, competitors, count };

    document.getElementById('runBtn').disabled = true;
    document.getElementById('runBtn').innerHTML = '⏳ Running Diagnostic...';
    showProgress(); hideResults(); chartsRendered = false;
    resetPhaseDots();

    try {
      diagnosticData = await AEOApi.runDiagnostic(params, updateProgress);
      renderResults(diagnosticData);
      showResults();
      switchTab('queries');
    } catch (err) {
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

  function resetPhaseDots() {
    document.querySelectorAll('.phase-dot').forEach(d => { d.classList.remove('active', 'done'); });
  }

  function updateProgress(evt) {
    const phase = evt.phase || 1;
    const pctVal = evt.pct || 0;
    const name = evt.name || 'Processing...';
    document.getElementById('phaseName').textContent = `Phase ${phase}/10: ${name}`;
    document.getElementById('phasePct').textContent = pctVal + '%';
    document.getElementById('progressFill').style.width = pctVal + '%';
    document.querySelectorAll('.phase-dot').forEach(d => {
      const p = parseInt(d.dataset.phase);
      if (p < phase) { d.classList.add('done'); d.classList.remove('active'); }
      else if (p === phase) { d.classList.add('active'); d.classList.remove('done'); }
    });
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
    if (tabId === 'analysis' && diagnosticData && !chartsRendered) {
      requestAnimationFrame(() => { requestAnimationFrame(() => {
        AEOComponents.drawAnalysisCharts(diagnosticData.aggregated);
        chartsRendered = true;
      }); });
    }
  }

  function renderResults(data) {
    AEOComponents.renderQueryCards(document.getElementById('queryCards'), data.results || []);
    AEOComponents.renderAnalysis(document.getElementById('tab-analysis'), data.aggregated || {});
    AEOComponents.renderGaps(document.getElementById('tab-gaps'), data.gaps || [], data.brand_name || '');
    AEOComponents.renderPredictive(document.getElementById('tab-predictive'), data.predictive || {});
    AEOComponents.renderActionPlan(document.getElementById('tab-plan'), data.action_plan || null);
  }

  function exportJSON() {
    if (!diagnosticData) return alert('Run a diagnostic first.');
    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'aeo-diagnostic-report.json'; a.click();
    URL.revokeObjectURL(url);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', AEOApp.init);
