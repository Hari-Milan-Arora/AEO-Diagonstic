import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  Gauge,
  LineChart,
  Loader2,
  Play,
  Radar,
  Search,
  Server,
  Sparkles,
  Target
} from "lucide-react";
import { API_BASE_URL, checkHealth, runDiagnostic } from "./api.js";

const tabs = [
  ["queries", "Per-Query Results", Search],
  ["analysis", "Aggregated Analysis", BarChart3],
  ["gaps", "Gap Analysis", AlertTriangle],
  ["predictive", "Predictive Insights", LineChart],
  ["plan", "30-Day Plan", Target]
];

const aiModels = ["chatgpt", "claude", "gemini", "ollama"];
const aiLabels = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  ollama: "Ollama"
};

const defaultForm = {
  brand: "",
  category: "",
  audience: "",
  competitors: "",
  count: 15
};

export default function App() {
  const [form, setForm] = useState(defaultForm);
  const [backendOk, setBackendOk] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("queries");

  useEffect(() => {
    let mounted = true;
    checkHealth().then((ok) => {
      if (!mounted) return;
      setBackendOk(ok);
      setIsChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const competitors = useMemo(
    () => form.competitors.split(",").map((item) => item.trim()).filter(Boolean),
    [form.competitors]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsRunning(true);
    setData(null);
    setActiveTab("queries");
    setProgress({ phase: 1, pct: 1, name: "Starting diagnostic" });

    try {
      const result = await runDiagnostic(
        {
          ...form,
          competitors,
          count: Number(form.count)
        },
        setProgress
      );
      setData(result);
      setProgress({ phase: 10, pct: 100, name: "Complete" });
    } catch (err) {
      setError(err.message || "Diagnostic failed");
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(null), 900);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function exportJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.brand_name || "aeo"}-diagnostic-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon"><Radar size={24} /></div>
          <h1>AEO Diagnostic Engine</h1>
        </div>
        <p className="subtitle">Multi-AI Brand Visibility Analyzer: ChatGPT, Claude, Gemini, Ollama</p>
        <div className="header-actions">
          <StatusBadge ok={backendOk} loading={isChecking} label="Backend" />
          <button className="btn btn-export" disabled={!data} onClick={exportJson}>
            <Download size={16} /> Export JSON
          </button>
        </div>
      </header>

      <section className="api-status-bar glass-card">
        <StatusItem label="FastAPI" ok={backendOk} loading={isChecking} />
        {aiModels.map((model) => <StatusItem key={model} label={aiLabels[model]} simulated />)}
      </section>

      {!backendOk && !isChecking && (
        <div className="alert-box">
          <AlertTriangle size={18} />
          <span>
            Backend is not reachable. Set <code>VITE_API_BASE_URL</code> in Vercel to your deployed FastAPI URL.
            Current API base: <code>{API_BASE_URL || "same origin"}</code>
          </span>
        </div>
      )}

      <section className="input-section glass-card">
        <h2><Sparkles size={20} /> Configure Diagnostic</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Brand Name" required>
            <input value={form.brand} onChange={(e) => updateField("brand", e.target.value)} placeholder="e.g. Nike, Shopify, Notion" required />
          </Field>
          <Field label="Category" required>
            <input value={form.category} onChange={(e) => updateField("category", e.target.value)} placeholder="e.g. Athletic Footwear" required />
          </Field>
          <Field label="Target Audience" required>
            <input value={form.audience} onChange={(e) => updateField("audience", e.target.value)} placeholder="e.g. Fitness enthusiasts" required />
          </Field>
          <Field label="Competitors">
            <input value={form.competitors} onChange={(e) => updateField("competitors", e.target.value)} placeholder="e.g. Adidas, New Balance, Asics" />
          </Field>
          <Field label="Number of Queries" full>
            <div className="slider-container">
              <input type="range" min="5" max="30" value={form.count} onChange={(e) => updateField("count", e.target.value)} />
              <span className="slider-value">{form.count}</span>
            </div>
          </Field>
          <div className="form-group full-width">
            <button className="btn btn-primary btn-run" disabled={isRunning || !form.brand || !form.category || !form.audience}>
              {isRunning ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              {isRunning ? "Running Diagnostic..." : "Run Full Diagnostic"}
            </button>
          </div>
        </form>
      </section>

      {error && <div className="alert-box danger"><AlertTriangle size={18} /><span>{error}</span></div>}
      {progress && <ProgressPanel progress={progress} />}

      {data && (
        <section className="results-section active">
          <nav className="tab-nav">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} className={`tab-btn ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>

          <div className="tab-panel active">
            {activeTab === "queries" && <QueryResults results={data.results || []} />}
            {activeTab === "analysis" && <AggregatedAnalysis aggregated={data.aggregated || {}} />}
            {activeTab === "gaps" && <GapAnalysis brand={data.brand_name} gaps={data.gaps || []} />}
            {activeTab === "predictive" && <PredictiveInsights predictive={data.predictive || {}} />}
            {activeTab === "plan" && <ActionPlan plan={data.action_plan} />}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, required, full, children }) {
  return (
    <label className={`form-group ${full ? "full-width" : ""}`}>
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function StatusBadge({ ok, loading, label }) {
  return (
    <div className={`mode-toggle ${ok ? "active" : "simulated"}`}>
      {loading ? <Loader2 className="spin" size={14} /> : <span className={`mode-indicator ${ok ? "live" : "simulation"}`} />}
      <span>{loading ? "Checking" : ok ? `${label} Online` : `${label} Offline`}</span>
    </div>
  );
}

function StatusItem({ label, ok, loading, simulated }) {
  return (
    <div className={`status-item ${ok ? "active" : ""} ${simulated || (!ok && !loading) ? "simulated" : ""}`}>
      {loading ? <Loader2 className="spin" size={13} /> : <span className="status-dot" />}
      <span>{label}{simulated ? " Simulation" : ""}</span>
    </div>
  );
}

function ProgressPanel({ progress }) {
  const phase = progress.phase || 1;
  const pct = progress.pct || 0;
  return (
    <section className="progress-section glass-card active">
      <div className="progress-label">
        <span>Phase {phase}/10: {progress.name || "Processing"}</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-phases">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((item) => (
          <span key={item} className={`phase-dot ${item < phase ? "done" : item === phase ? "active" : ""}`}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function QueryResults({ results }) {
  return (
    <div className="query-list">
      {results.map((result, index) => <QueryCard key={`${result.query}-${index}`} result={result} index={index} />)}
    </div>
  );
}

function QueryCard({ result, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <article className={`query-card ${open ? "expanded" : ""}`}>
      <button className="query-card-header" onClick={() => setOpen(!open)}>
        <div className="query-title">
          <span className="query-number">Q{index + 1}</span>
          <h3>{result.query}</h3>
        </div>
        <span className={`mention-prob ${probClass(result.ai_mention_probability)}`}>{result.ai_mention_probability}</span>
        <ChevronDown className="chevron" size={20} />
      </button>
      {open && (
        <div className="query-card-body">
          <div className="ai-responses-grid">
            {aiModels.map((model) => (
              <AiResponse key={model} model={model} text={result.responses?.[model] || ""} present={result.brand_presence?.[model]} />
            ))}
          </div>
          <div className="consensus-card">
            <span className="consensus-badge">Consensus {result.brand_presence?.consensus ? "Found" : "Absent"}</span>
            <FormattedText text={result.responses?.consensus || ""} />
          </div>
          <div className="scores-row">
            <ScorePill label="Visibility" value={result.scores?.visibility} />
            <ScorePill label="Authority" value={result.scores?.authority} />
            <ScorePill label="Relevance" value={result.scores?.relevance} />
            <ScorePill label="Trust" value={result.scores?.trust} />
            <InfoPill label="Position" value={result.position} />
            <InfoPill label="Sentiment" value={result.sentiment} />
          </div>
          <div className="insight-box"><strong>Insight:</strong> {result.insight}</div>
          <div className="insight-box accent"><strong>Recommendation:</strong> {result.recommendations}</div>
        </div>
      )}
    </article>
  );
}

function AiResponse({ model, text, present }) {
  return (
    <div className="ai-response-card">
      <span className={`ai-badge ${model}`}>{aiLabels[model]}</span>
      <span className={`presence-indicator ${present ? "present" : "absent"}`}>{present ? "Found" : "Absent"}</span>
      <FormattedText text={text} />
    </div>
  );
}

function FormattedText({ text }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="response-text">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part.split("\n").map((line, lineIndex, arr) => (
          <span key={`${index}-${lineIndex}`}>{line}{lineIndex < arr.length - 1 ? <br /> : null}</span>
        ));
      })}
    </div>
  );
}

function AggregatedAnalysis({ aggregated }) {
  const scores = aggregated.avg_scores || {};
  const perAi = aggregated.per_ai_mention || {};
  const competitors = aggregated.top_competitors || [];
  return (
    <div>
      <h2 className="section-title"><BarChart3 size={20} /> Aggregated Analysis</h2>
      <div className="stats-grid">
        <Stat label="Overall Visibility" value={aggregated.overall_visibility ?? 0} />
        <Stat label="Mention Rate" value={`${aggregated.mention_rate ?? 0}%`} />
        <Stat label="Consensus Rate" value={`${aggregated.consensus_mention_rate ?? 0}%`} />
        <Stat label="Consensus Strength" value={`${Math.round(aggregated.consensus_strength || 0)}%`} />
      </div>
      <div className="charts-grid">
        <ScorePanel scores={scores} />
        <BarPanel title="Per-AI Mention Rate" rows={aiModels.map((model) => ({ label: aiLabels[model], value: perAi[model] || 0, className: model }))} />
        <GaugePanel value={aggregated.overall_visibility || 0} />
        <BarPanel title="Competitor Dominance" rows={competitors.map((item) => ({ label: item.name, value: item.frequency }))} />
      </div>
      <div className="sw-grid">
        <ListCard title="Top Strengths" items={aggregated.strengths || []} positive />
        <ListCard title="Key Weaknesses" items={aggregated.weaknesses || []} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="stat-card"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>;
}

function ScorePanel({ scores }) {
  const rows = ["visibility", "authority", "relevance", "trust"].map((key) => ({
    label: key[0].toUpperCase() + key.slice(1),
    value: scores[key] || 0
  }));
  return <BarPanel title="Average ML Scores" rows={rows} max={10} suffix="/10" />;
}

function GaugePanel({ value }) {
  return (
    <div className="chart-container gauge-panel">
      <h3><Gauge size={16} /> Overall Visibility</h3>
      <div className="gauge" style={{ "--value": `${Math.min(value, 100)}%` }}>
        <span>{Math.round(value)}</span>
      </div>
    </div>
  );
}

function BarPanel({ title, rows, max = 100, suffix = "%" }) {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <div className="bar-list">
        {(rows || []).length ? rows.map((row) => (
          <div className="bar-row" key={row.label}>
            <span>{row.label}</span>
            <div className="bar-track"><div className={`bar-fill ${row.className || ""}`} style={{ width: `${Math.min((row.value / max) * 100, 100)}%` }} /></div>
            <strong>{Math.round(row.value)}{suffix}</strong>
          </div>
        )) : <p className="muted">No data available.</p>}
      </div>
    </div>
  );
}

function ListCard({ title, items, positive }) {
  return (
    <div className="sw-card">
      <h3>{positive ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />} {title}</h3>
      <ul>{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No items detected.</li>}</ul>
    </div>
  );
}

function GapAnalysis({ brand, gaps }) {
  return (
    <div>
      <h2 className="section-title"><AlertTriangle size={20} /> Strategic Gap Analysis for {brand}</h2>
      {gaps.map((gap) => <div className="gap-section" key={gap.title}><h3>{gap.title}</h3><p>{gap.detail}</p></div>)}
    </div>
  );
}

function PredictiveInsights({ predictive }) {
  const trend = predictive.trend_projection || {};
  return (
    <div>
      <h2 className="section-title"><Activity size={20} /> Predictive Insights</h2>
      <div className="predictive-grid">
        <Stat label="Future Ranking Probability" value={`${predictive.future_ranking_probability || 0}%`} />
        <div className="predict-card">
          <h3>Fastest Improving Query Types</h3>
          <ul className="trend-list">{(predictive.fastest_improving_queries || []).map((item) => <li key={item}><span>{item}</span><strong>High potential</strong></li>)}</ul>
        </div>
        <div className="predict-card">
          <h3>Competitor Risk</h3>
          <p>{predictive.competitor_dominance_risk || "No risk data available."}</p>
        </div>
        <BarPanel title="90-Day Trend Projection" rows={Object.entries(trend).map(([label, value]) => ({ label: label.replace("_", " "), value }))} />
      </div>
      <div className="predict-summary"><strong>Summary:</strong> {predictive.summary}</div>
    </div>
  );
}

function ActionPlan({ plan }) {
  if (!plan) return <p className="muted">No action plan generated.</p>;
  return (
    <div>
      <h2 className="section-title"><Target size={20} /> 30-Day AEO Improvement Roadmap</h2>
      <div className="timeline">
        {[plan.week1, plan.week2, plan.advanced].filter(Boolean).map((week) => (
          <div className="timeline-week" key={week.title}>
            <h3>{week.title}</h3>
            {(week.actions || []).map((action) => (
              <div className="action-item" key={action.title}>
                <div className="action-title">{action.title}</div>
                <div className="action-desc">{action.desc}</div>
                <span className={`impact-tag ${action.impact}`}>{action.impact} impact</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorePill({ label, value = 0 }) {
  return <div className="score-pill"><span>{label}</span><strong className={scoreClass(value)}>{value}/10</strong></div>;
}

function InfoPill({ label, value }) {
  return <div className="score-pill"><span>{label}</span><strong>{value}</strong></div>;
}

function scoreClass(value) {
  return value >= 7 ? "high" : value >= 4 ? "medium" : "low";
}

function probClass(value) {
  const numeric = Number.parseInt(value, 10) || 0;
  return numeric >= 60 ? "high" : numeric >= 30 ? "medium" : "low";
}
