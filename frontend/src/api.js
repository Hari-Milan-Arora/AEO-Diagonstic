const configuredBase = import.meta.env.VITE_API_BASE_URL || "";
export const API_BASE_URL = configuredBase.replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function checkHealth() {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const response = await fetch(apiUrl("/api/health"), {
      signal: controller.signal
    });
    window.clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

export async function runDiagnostic(params, onProgress) {
  const payload = {
    brand_name: params.brand.trim(),
    category: params.category.trim(),
    audience: params.audience.trim(),
    competitors: params.competitors,
    num_queries: params.count
  };

  const response = await fetch(apiUrl("/api/diagnostic/run-stream"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Backend returned ${response.status}`);
  }

  if (!response.body) {
    return runDiagnosticFallback(payload);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "progress";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const event = parseSseChunk(chunk, eventType);
      eventType = event.lastEventType;

      if (event.type === "progress") {
        onProgress?.(event.data);
      }
      if (event.type === "result") {
        return event.data;
      }
      if (event.type === "error") {
        throw new Error(event.data?.error || "Diagnostic failed");
      }
    }
  }

  throw new Error("Diagnostic stream ended before returning a result");
}

async function runDiagnosticFallback(payload) {
  const response = await fetch(apiUrl("/api/diagnostic/run"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Backend returned ${response.status}`);
  }
  return response.json();
}

function parseSseChunk(chunk, previousType) {
  let type = previousType || "progress";
  let data = null;

  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) {
      type = line.slice(6).trim();
    }
    if (line.startsWith("data:")) {
      data = JSON.parse(line.slice(5).trim());
    }
  }

  return {
    type,
    data,
    lastEventType: type
  };
}
