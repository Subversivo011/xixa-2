import { send, lerJson, clean, limited } from '../lib/http.js';

export default function registrar(r) {
  r.post('/api/feedback', async ({ req, res, pool, ip }) => {
    if (limited('f:' + ip, 10)) return send(res, 429, { erro: 'Muitas tentativas.' });
    const b = await lerJson(req);
    if (b === undefined) return send(res, 400, { erro: 'json inválido' });
    if (b['bot-field']) return send(res, 201, { ok: true });
    const msg = clean(b.msg, 2000);
    if (msg.length < 5) return send(res, 422, { erro: 'Mensagem curta demais.' });
    await pool.query('INSERT INTO feedback (tipo, msg, contato, pagina) VALUES ($1,$2,$3,$4)',
      [clean(b.tipo, 20) || 'ideia', msg, clean(b.contato, 120) || null, clean(b.pagina, 200) || null]);
    return send(res, 201, { ok: true });
  });
}
