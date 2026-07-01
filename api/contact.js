const { parseBody, clean, emailOk, json, cors, clientIp, rateLimit, deliver } = require('./_utils');

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método no permitido.' });

  if (!rateLimit(clientIp(req)).ok) {
    return json(res, 429, { ok: false, error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' });
  }

  const body = await parseBody(req);
  if (clean(body.website)) return json(res, 200, { ok: true, message: 'Mensaje recibido.' });

  const nombre = clean(body.nombre, 120);
  const email = clean(body.email, 160);
  const motivo = clean(body.motivo || 'Contacto', 100);
  const mensaje = clean(body.mensaje, 1800);

  if (!nombre || !emailOk(email) || !mensaje) {
    return json(res, 400, { ok: false, error: 'Revisa nombre, correo y mensaje.' });
  }

  const id = 'CNT-' + Date.now().toString(36).toUpperCase();
  const record = { id, nombre, email, motivo, mensaje, receivedAt: new Date().toISOString() };
  await deliver('contact', 'Nuevo contacto DITT UNAB', record);

  return json(res, 200, { ok: true, id, message: 'Mensaje enviado correctamente. Te contactaremos a la brevedad.' });
};
