import http from 'node:http';
import { buildWatchSnapshot } from './watch.mjs';
import { healthReport } from './health.mjs';

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

function dashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>agent-relay</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; max-width: 960px; }
    h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.875rem; margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; font-size: 0.875rem; }
    th, td { border: 1px solid #ccc; padding: 0.35rem 0.5rem; text-align: left; }
    th { background: #f4f4f4; }
    section h2 { font-size: 1rem; margin: 0 0 0.5rem; }
    .empty { color: #888; font-style: italic; }
    .err { color: #b00; }
  </style>
</head>
<body>
  <h1>agent-relay watch</h1>
  <p class="meta" id="meta">loading…</p>

  <section>
    <h2>Status counts</h2>
    <div id="counts"></div>
  </section>

  <section>
    <h2>Active tasks</h2>
    <div id="active"></div>
  </section>

  <section>
    <h2>Recent progress (pending)</h2>
    <div id="progress"></div>
  </section>

  <script>
    function esc(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function table(headers, rows) {
      if (!rows.length) return '<p class="empty">(none)</p>';
      const th = headers.map(h => '<th>' + esc(h) + '</th>').join('');
      const tr = rows.map(r =>
        '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>'
      ).join('');
      return '<table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>';
    }

    async function refresh() {
      try {
        const res = await fetch('/api/watch');
        const snap = await res.json();
        document.getElementById('meta').textContent =
          'home: ' + snap.home + '  node: ' + snap.nodeId + '  at: ' + snap.ts;

        const countRows = Object.entries(snap.counts || {}).map(([node, b]) => [
          node,
          b.pending ?? 0,
          b.active ?? 0,
          b.done ?? 0,
          b.failed ?? 0,
        ]);
        document.getElementById('counts').innerHTML =
          table(['node', 'pending', 'active', 'done', 'failed'], countRows);

        const activeRows = (snap.active || []).map(t => [
          t.node,
          t.id,
          t.type,
          (t.from ?? '-') + '→' + (t.to ?? '-'),
          t.title ?? '(no title)',
        ]);
        document.getElementById('active').innerHTML =
          table(['node', 'id', 'type', 'route', 'title'], activeRows);

        const progRows = (snap.progressPending || []).map(t => [
          t.node,
          t.id,
          t.taskId || '-',
          t.title ?? '(no title)',
        ]);
        document.getElementById('progress').innerHTML =
          table(['node', 'id', 'taskId', 'title'], progRows);
      } catch (err) {
        document.getElementById('meta').innerHTML =
          '<span class="err">refresh failed: ' + esc(err.message) + '</span>';
      }
    }

    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}

export function createServeHandler(config) {
  return (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const { pathname } = url;

    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'method not allowed' });
      return;
    }

    if (pathname === '/api/watch') {
      try {
        sendJson(res, 200, buildWatchSnapshot(config));
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    if (pathname === '/api/health') {
      try {
        sendJson(res, 200, healthReport(config.home));
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    if (pathname === '/') {
      sendHtml(res, dashboardHtml());
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not found' });
  };
}

export function startServe(config, { host = '127.0.0.1', port = 3847 } = {}) {
  const server = http.createServer(createServeHandler(config));
  server.listen(port, host);
  return server;
}
