// Vercel serverless function — proxy ระหว่าง browser กับ n8n webhook
// แก้ปัญหา CORS โดย fetch n8n server-side แล้วใส่ CORS header เองก่อน return

const N8N_URL = 'https://n8n-external.exservice.io/webhook/thonglor-radar';

export default async function handler(req, res) {
  // CORS headers — อนุญาตให้ browser fetch ได้
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // 12s timeout
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);

    const r = await fetch(N8N_URL, {
      signal: ctl.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timer);

    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: `Upstream returned ${r.status}`
      });
    }

    const data = await r.json();
    return res.status(200).json(data);

  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: e.name === 'AbortError' ? 'Upstream timeout' : String(e.message || e)
    });
  }
}
