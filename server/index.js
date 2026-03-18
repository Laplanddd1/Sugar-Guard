const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

const PORT = parseInt(process.env.PORT || '3001', 10);
const DIFY_API_BASE = (process.env.DIFY_API_BASE || 'http://127.0.0.1/v1').replace(/\/+$/, '');

function loadAppKeyMap() {
  const raw = process.env.DIFY_APP_KEY_MAP;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

function getAppKey(appName) {
  if (!appName || typeof appName !== 'string') return null;
  const map = loadAppKeyMap();
  if (map && typeof map[appName] === 'string' && map[appName]) return map[appName];
  const envKey = process.env[`DIFY_KEY_${appName}`];
  if (typeof envKey === 'string' && envKey) return envKey;
  return null;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

app.get('/api/dify/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/dify/workflows/run', async (req, res) => {
  try {
    const appName = req.body?.app;
    const key = getAppKey(appName);
    if (!key) {
      return res.status(400).json({ code: 'invalid_param', message: `Unknown app: ${appName}` });
    }

    const inputs = req.body?.inputs && typeof req.body.inputs === 'object' ? req.body.inputs : {};
    const user = typeof req.body?.user === 'string' ? req.body.user : 'guest';
    const response_mode = req.body?.response_mode === 'streaming' ? 'streaming' : 'blocking';

    const url = `${DIFY_API_BASE}/workflows/run`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs, response_mode, user }),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ code: 'server_error', message: 'Proxy error' });
  }
});

app.post('/api/dify/chat-messages', async (req, res) => {
  try {
    const appName = req.body?.app;
    const key = getAppKey(appName);
    if (!key) {
      return res.status(400).json({ code: 'invalid_param', message: `Unknown app: ${appName}` });
    }

    const query = typeof req.body?.query === 'string' ? req.body.query : '';
    const inputs = req.body?.inputs && typeof req.body.inputs === 'object' ? req.body.inputs : {};
    const user = typeof req.body?.user === 'string' ? req.body.user : 'guest';
    const conversation_id = typeof req.body?.conversation_id === 'string' ? req.body.conversation_id : undefined;

    const url = `${DIFY_API_BASE}/chat-messages`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        query,
        response_mode: 'streaming',
        user,
        ...(conversation_id ? { conversation_id } : {}),
      }),
    });

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.send(text);
    }

    if (!upstream.body) return res.status(500).send('No upstream body');
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    return res.end();
  } catch (e) {
    return res.status(500).json({ code: 'server_error', message: 'Proxy error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[sugar-guard-proxy] listening on :${PORT}, dify=${DIFY_API_BASE}`);
});

