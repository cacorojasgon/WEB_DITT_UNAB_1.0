const { parseBody, clean, emailOk, json, cors, clientIp, rateLimit, deliver } = require('./_utils');

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método no permitido.' });

  if (!rateLimit(clientIp(req)).ok) {
    return json(res, 429, { ok: false, error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' });
  }

  const body = await parseBody(req);
  if (clean(body.website)) return json(res, 200, { ok: true, id: 'OK' });

  const titulo = clean(body.titulo, 160);
  const investigador = clean(body.investigador, 120);
  const email = clean(body.email, 160);
  const resumen = clean(body.resumen, 2200);
  const consentimiento = clean(body.consentimiento, 20);

  if (!titulo || !investigador || !emailOk(email) || !resumen || consentimiento !== 'acepto') {
    return json(res, 400, { ok: false, error: 'Faltan campos obligatorios o el correo no es válido.' });
  }

  const id = 'DITT-' + Date.now().toString(36).toUpperCase();
  const record = {
    id,
    titulo,
    investigador,
    email,
    facultad: clean(body.facultad, 120),
    trl: clean(body.trl, 20),
    proteccion: clean(body.proteccion, 80),
    area: clean(body.area, 80),
    aplicaciones: clean(body.aplicaciones, 800),
    resumen,
    receivedAt: new Date().toISOString()
  };
  await deliver('declaracion', 'Nueva declaración de invención DITT UNAB', record);

  return json(res, 200, { ok: true, id, message: 'Declaración recibida.' });
};
