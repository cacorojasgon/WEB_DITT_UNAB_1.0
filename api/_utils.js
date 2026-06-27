async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function clean(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function emailOk(value) {
  const email = String(value || '');
  if (email.length > 254) return false;
  // Rechaza puntos consecutivos o al inicio/fin del dominio y exige un TLD de 2+ letras.
  return /^[^\s@]+@(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/.test(email) && !/\.\./.test(email);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
  }[c]));
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function cors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || 'https://ditt-unab.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Rate limit "best-effort" en memoria. En serverless el estado es por instancia y
// efímero, por lo que no es una garantía absoluta; combinado con el honeypot frena
// ráfagas de spam en un sitio de bajo tráfico.
const rateBuckets = new Map();
function rateLimit(ip, { max = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) {
    // Evita crecimiento ilimitado del Map en instancias muy longevas.
    for (const [key, times] of rateBuckets) {
      if (!times.some((t) => now - t < windowMs)) rateBuckets.delete(key);
    }
  }
  return { ok: hits.length <= max, remaining: Math.max(0, max - hits.length) };
}

async function forwardToWebhook(kind, payload) {
  const url = process.env.FORM_WEBHOOK_URL || process.env.DITT_FORMS_WEBHOOK_URL;
  if (!url) return { forwarded: false, reason: 'no webhook configured' };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, payload })
  });
  return { forwarded: response.ok, status: response.status };
}

async function notifyByResend(subject, fields) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUBMISSION_TO_EMAIL;
  const from = process.env.SUBMISSION_FROM_EMAIL || 'DITT UNAB <onboarding@resend.dev>';
  if (!apiKey || !to) return { skipped: true };
  const rows = Object.entries(fields).map(([k, v]) => {
    return `<tr><td style="padding:6px 12px;border-bottom:1px solid #ddd"><strong>${escapeHtml(k)}</strong></td><td style="padding:6px 12px;border-bottom:1px solid #ddd">${escapeHtml(v)}</td></tr>`;
  }).join('');
  const html = `<h2>${escapeHtml(subject)}</h2><table>${rows}</table>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html })
  });
  return { ok: response.ok, status: response.status };
}

async function deliver(kind, subject, payload) {
  console.log(`[${kind}]`, JSON.stringify(payload));
  const webhook = await forwardToWebhook(kind, payload).catch((error) => ({ forwarded: false, error: error.message }));
  const email = await notifyByResend(subject, payload).catch((error) => ({ ok: false, error: error.message }));
  return { webhook, email };
}

module.exports = { parseBody, clean, emailOk, escapeHtml, json, cors, clientIp, rateLimit, deliver };
