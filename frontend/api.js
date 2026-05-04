/* AEO API Client — Connects frontend to FastAPI backend */
const AEOApi = (() => {
  const BASE = window.location.origin;

  async function runDiagnostic(params, onProgress) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        brand_name: params.brand,
        category: params.category,
        audience: params.audience,
        competitors: params.competitors || [],
        num_queries: params.count || 15,
      });

      const evtSource = new EventSource_POST(`${BASE}/api/diagnostic/run-stream`, body);

      evtSource.onProgress = (evt) => {
        if (onProgress) onProgress(evt);
      };
      evtSource.onResult = (data) => {
        resolve(data);
      };
      evtSource.onError = (err) => {
        reject(new Error(err.error || 'Diagnostic failed'));
      };
    });
  }

  // SSE via fetch (EventSource doesn't support POST)
  function EventSource_POST(url, body) {
    const self = { onProgress: null, onResult: null, onError: null };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Server error' }));
        if (self.onError) self.onError({ error: err.detail || 'Server error' });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = 'progress';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'progress' && self.onProgress) {
              self.onProgress(data);
            } else if (eventType === 'result' && self.onResult) {
              self.onResult(data);
            } else if (eventType === 'error' && self.onError) {
              self.onError(data);
            }
          }
        }
      }
    }).catch(err => {
      if (self.onError) self.onError({ error: err.message });
    });

    return self;
  }

  async function checkHealth() {
    try {
      const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch { return false; }
  }

  return { runDiagnostic, checkHealth };
})();
