/* ===== AEO Charts Library — Canvas-based, zero dependencies ===== */

const AEOCharts = (() => {
  const COLORS = {
    accent1: '#6366f1',
    accent2: '#8b5cf6',
    accent3: '#a855f7',
    chatgpt: '#10a37f',
    claude: '#d97706',
    gemini: '#4285f4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    bgCard: '#0f1629',
    grid: 'rgba(99,102,241,0.1)',
  };

  function initCanvas(canvas, aspectRatio = 1) {
    const parent = canvas.parentElement;
    const w = Math.max(parent.clientWidth - 32, 200);
    const h = Math.max(Math.min(w * aspectRatio, 350), 80);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  /* ===== GAUGE CHART ===== */
  function drawGauge(canvas, value, max = 100) {
    const { ctx, w, h } = initCanvas(canvas, 0.6);
    const cx = w / 2, cy = h * 0.75;
    const radius = Math.min(w, h) * 0.55;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const pct = Math.min(value / max, 1);

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(99,102,241,0.12)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    const valAngle = startAngle + pct * Math.PI;
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    grad.addColorStop(0, COLORS.accent1);
    grad.addColorStop(0.5, COLORS.accent2);
    grad.addColorStop(1, COLORS.accent3);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value text
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `800 ${radius * 0.45}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value), cx, cy - 10);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `500 ${radius * 0.15}px Inter, sans-serif`;
    ctx.fillText(`/ ${max}`, cx, cy + radius * 0.2);
  }

  /* ===== RADAR CHART ===== */
  function drawRadar(canvas, data) {
    const { ctx, w, h } = initCanvas(canvas, 0.85);
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.35;
    const labels = Object.keys(data);
    const values = Object.values(data);
    const n = labels.length;
    const angleStep = (2 * Math.PI) / n;
    const startOffset = -Math.PI / 2;

    // Grid rings
    for (let r = 2; r <= 10; r += 2) {
      ctx.beginPath();
      const ringR = (r / 10) * radius;
      for (let i = 0; i <= n; i++) {
        const angle = startOffset + i * angleStep;
        const x = cx + ringR * Math.cos(angle);
        const y = cy + ringR * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axis lines + labels
    for (let i = 0; i < n; i++) {
      const angle = startOffset + i * angleStep;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();

      const lx = cx + (radius + 20) * Math.cos(angle);
      const ly = cy + (radius + 20) * Math.sin(angle);
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '500 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = startOffset + idx * angleStep;
      const r = (values[idx] / 10) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    const fillGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(radius, 1));
    fillGrad.addColorStop(0, 'rgba(99,102,241,0.25)');
    fillGrad.addColorStop(1, 'rgba(168,85,247,0.08)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
    ctx.strokeStyle = COLORS.accent1;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    for (let i = 0; i < n; i++) {
      const angle = startOffset + i * angleStep;
      const r = (values[i] / 10) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.accent2;
      ctx.fill();
      ctx.strokeStyle = COLORS.bgCard;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /* ===== BAR CHART (Grouped) ===== */
  function drawBarChart(canvas, data) {
    const { ctx, w, h } = initCanvas(canvas, 0.6);
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const colors = data.map(d => d.color || COLORS.accent1);
    const maxVal = Math.max(...values, 1);

    // Y-axis lines
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '400 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((i / 4) * maxVal) + '%', pad.left - 8, y);
    }

    // Bars
    const barW = Math.min(chartW / labels.length * 0.6, 50);
    const gap = (chartW - barW * labels.length) / (labels.length + 1);

    labels.forEach((label, i) => {
      const x = pad.left + gap + i * (barW + gap);
      const barH = (values[i] / maxVal) * chartH;
      const y = pad.top + chartH - barH;

      // Bar with rounded top
      const r = Math.min(barW / 2, 6);
      ctx.beginPath();
      ctx.moveTo(x, pad.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, pad.top + chartH);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      // Value on top
      ctx.fillStyle = COLORS.textPrimary;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(values[i]) + '%', x + barW / 2, y - 8);

      // Label
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(label, x + barW / 2, pad.top + chartH + 20);
    });
  }

  /* ===== DONUT CHART ===== */
  function drawDonut(canvas, value, label = 'Mention Rate') {
    const { ctx, w, h } = initCanvas(canvas, 0.85);
    const cx = w / 2, cy = h / 2;
    const outerR = Math.min(w, h) * 0.35;
    const innerR = outerR * 0.7;
    const pct = Math.min(value / 100, 1);

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    ctx.arc(cx, cy, innerR, 2 * Math.PI, 0, true);
    ctx.fillStyle = 'rgba(99,102,241,0.08)';
    ctx.fill();

    // Value ring
    const startA = -Math.PI / 2;
    const endA = startA + pct * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startA, endA);
    ctx.arc(cx, cy, innerR, endA, startA, true);
    ctx.closePath();
    const grad = ctx.createLinearGradient(cx - outerR, cy, cx + outerR, cy);
    grad.addColorStop(0, COLORS.accent1);
    grad.addColorStop(1, COLORS.accent3);
    ctx.fillStyle = grad;
    ctx.fill();

    // Center text
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `800 ${innerR * 0.5}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value) + '%', cx, cy - 5);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `400 ${innerR * 0.18}px Inter, sans-serif`;
    ctx.fillText(label, cx, cy + innerR * 0.3);
  }

  /* ===== HORIZONTAL BAR CHART ===== */
  function drawHorizontalBars(canvas, data) {
    const maxItems = Math.min(data.length, 8);
    const itemH = 36;
    const totalH = maxItems * itemH + 40;
    const { ctx, w } = initCanvas(canvas, totalH / (canvas.parentElement.clientWidth - 32));
    const h = totalH;
    const pad = { left: 100, right: 30 };
    const chartW = w - pad.left - pad.right;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    data.slice(0, maxItems).forEach((item, i) => {
      const y = 20 + i * itemH;
      const barW = (item.value / maxVal) * chartW;
      const barH = 22;

      // Label
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '500 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const displayLabel = item.label.length > 12 ? item.label.substring(0, 12) + '…' : item.label;
      ctx.fillText(displayLabel, pad.left - 10, y + barH / 2);

      // Bar background
      ctx.fillStyle = 'rgba(99,102,241,0.06)';
      ctx.beginPath();
      ctx.roundRect(pad.left, y, chartW, barH, 4);
      ctx.fill();

      // Bar
      if (barW > 0) {
        ctx.fillStyle = item.color || COLORS.accent1;
        ctx.beginPath();
        ctx.roundRect(pad.left, y, barW, barH, 4);
        ctx.fill();
      }

      // Value
      ctx.fillStyle = COLORS.textPrimary;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(item.value) + '%', pad.left + barW + 8, y + barH / 2);
    });
  }

  return { drawGauge, drawRadar, drawBarChart, drawDonut, drawHorizontalBars, COLORS };
})();
