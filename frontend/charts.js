/* AEO Charts Library — Canvas-based, zero dependencies */
const AEOCharts = (() => {
  const COLORS = {
    accent1: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7',
    chatgpt: '#10a37f', claude: '#d97706', gemini: '#4285f4', ollama: '#ff6b35',
    success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
    textPrimary: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b',
    bgCard: '#0f1629', grid: 'rgba(99,102,241,0.1)',
  };

  function initCanvas(canvas, aspectRatio = 1) {
    const parent = canvas.parentElement;
    const w = Math.max(parent.clientWidth - 32, 200);
    const h = Math.max(Math.min(w * aspectRatio, 350), 80);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  function drawGauge(canvas, value, max = 100) {
    const { ctx, w, h } = initCanvas(canvas, 0.6);
    const cx = w / 2, cy = h * 0.75, radius = Math.min(w, h) * 0.55;
    const pct = Math.min(value / max, 1);
    ctx.beginPath(); ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(99,102,241,0.12)'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke();
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    grad.addColorStop(0, COLORS.accent1); grad.addColorStop(0.5, COLORS.accent2); grad.addColorStop(1, COLORS.accent3);
    ctx.beginPath(); ctx.arc(cx, cy, radius, Math.PI, Math.PI + pct * Math.PI);
    ctx.strokeStyle = grad; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = COLORS.textPrimary; ctx.font = `800 ${radius * 0.45}px Outfit, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(value), cx, cy - 10);
    ctx.fillStyle = COLORS.textMuted; ctx.font = `500 ${radius * 0.15}px Inter, sans-serif`;
    ctx.fillText(`/ ${max}`, cx, cy + radius * 0.2);
  }

  function drawRadar(canvas, data) {
    const { ctx, w, h } = initCanvas(canvas, 0.85);
    const cx = w / 2, cy = h / 2, radius = Math.min(w, h) * 0.35;
    const labels = Object.keys(data), values = Object.values(data), n = labels.length;
    const step = (2 * Math.PI) / n, off = -Math.PI / 2;
    for (let r = 2; r <= 10; r += 2) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const a = off + i * step, rr = (r / 10) * radius;
        i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)) : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < n; i++) { const a = off + i * step;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = COLORS.textSecondary; ctx.font = '500 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], cx + (radius + 20) * Math.cos(a), cy + (radius + 20) * Math.sin(a));
    }
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const idx = i % n, a = off + idx * step, rr = (values[idx] / 10) * radius;
      i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)) : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    ctx.closePath();
    const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(radius, 1));
    fg.addColorStop(0, 'rgba(99,102,241,0.25)'); fg.addColorStop(1, 'rgba(168,85,247,0.08)');
    ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = COLORS.accent1; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < n; i++) { const a = off + i * step, rr = (values[i] / 10) * radius;
      ctx.beginPath(); ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 5, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.accent2; ctx.fill(); ctx.strokeStyle = COLORS.bgCard; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawBarChart(canvas, data) {
    const { ctx, w, h } = initCanvas(canvas, 0.6);
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const cW = w - pad.left - pad.right, cH = h - pad.top - pad.bottom;
    const vals = data.map(d => d.value), maxVal = Math.max(...vals, 1);
    for (let i = 0; i <= 4; i++) { const y = pad.top + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = COLORS.textMuted; ctx.font = '400 11px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((i / 4) * maxVal) + '%', pad.left - 8, y); }
    const bW = Math.min(cW / data.length * 0.6, 50), gap = (cW - bW * data.length) / (data.length + 1);
    data.forEach((d, i) => { const x = pad.left + gap + i * (bW + gap), bH = (d.value / maxVal) * cH, y = pad.top + cH - bH;
      const r = Math.min(bW / 2, 6);
      ctx.beginPath(); ctx.moveTo(x, pad.top + cH); ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y); ctx.lineTo(x + bW - r, y);
      ctx.quadraticCurveTo(x + bW, y, x + bW, y + r); ctx.lineTo(x + bW, pad.top + cH);
      ctx.closePath(); ctx.fillStyle = d.color || COLORS.accent1; ctx.fill();
      ctx.fillStyle = COLORS.textPrimary; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.round(d.value) + '%', x + bW / 2, y - 8);
      ctx.fillStyle = COLORS.textSecondary; ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(d.label, x + bW / 2, pad.top + cH + 20); });
  }

  function drawHorizontalBars(canvas, data) {
    const maxItems = Math.min(data.length, 8), itemH = 36, totalH = maxItems * itemH + 40;
    const { ctx, w } = initCanvas(canvas, totalH / (canvas.parentElement.clientWidth - 32));
    const pad = { left: 100, right: 30 }, chartW = w - pad.left - pad.right;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    data.slice(0, maxItems).forEach((item, i) => { const y = 20 + i * itemH, barH = 22, bW = (item.value / maxVal) * chartW;
      ctx.fillStyle = COLORS.textSecondary; ctx.font = '500 12px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(item.label.length > 12 ? item.label.substring(0, 12) + '…' : item.label, pad.left - 10, y + barH / 2);
      ctx.fillStyle = 'rgba(99,102,241,0.06)'; ctx.beginPath(); ctx.roundRect(pad.left, y, chartW, barH, 4); ctx.fill();
      if (bW > 0) { ctx.fillStyle = item.color || COLORS.accent1; ctx.beginPath(); ctx.roundRect(pad.left, y, bW, barH, 4); ctx.fill(); }
      ctx.fillStyle = COLORS.textPrimary; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(Math.round(item.value) + '%', pad.left + bW + 8, y + barH / 2); });
  }

  function drawTrendLine(canvas, data) {
    const { ctx, w, h } = initCanvas(canvas, 0.5);
    const pad = { top: 20, right: 30, bottom: 40, left: 50 };
    const cW = w - pad.left - pad.right, cH = h - pad.top - pad.bottom;
    const labels = Object.keys(data), vals = Object.values(data);
    const maxVal = Math.max(...vals, 1);
    for (let i = 0; i <= 4; i++) { const y = pad.top + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = COLORS.textMuted; ctx.font = '400 11px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((i / 4) * maxVal), pad.left - 8, y); }
    const grad = ctx.createLinearGradient(pad.left, pad.top, pad.left + cW, pad.top);
    grad.addColorStop(0, COLORS.accent1); grad.addColorStop(1, COLORS.accent3);
    ctx.beginPath();
    vals.forEach((v, i) => { const x = pad.left + (i / (vals.length - 1)) * cW, y = pad.top + cH - (v / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.stroke();
    vals.forEach((v, i) => { const x = pad.left + (i / (vals.length - 1)) * cW, y = pad.top + cH - (v / maxVal) * cH;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI); ctx.fillStyle = COLORS.accent2; ctx.fill();
      ctx.strokeStyle = COLORS.bgCard; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = COLORS.textPrimary; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.round(v), x, y - 14); });
    labels.forEach((l, i) => { const x = pad.left + (i / (labels.length - 1)) * cW;
      ctx.fillStyle = COLORS.textSecondary; ctx.font = '500 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(l, x, pad.top + cH + 20); });
  }

  return { drawGauge, drawRadar, drawBarChart, drawHorizontalBars, drawTrendLine, COLORS };
})();
