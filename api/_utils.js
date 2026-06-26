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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
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
    const safe = String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return `<tr><td style="padding:6px 12px;border-bottom:1px solid #ddd"><strong>${k}</strong></td><td style="padding:6px 12px;border-bottom:1px solid #ddd">${safe}</td></tr>`;
  }).join('');
  const html = `<h2>${subject}</h2><table>${rows}</table>`;
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

module.exports = { parseBody, clean, emailOk, json, deliver };
