// Votos agregados e anônimos do protótipo (tabela votos_legado). Voto por usuário vem com o login.
import { send, lerJson, limited } from '../lib/http.js';

export const VOTE_ID = /^[a-z0-9-]{1,80}$/;
const clampV = (v) => (v === 1 || v === -1 ? v : 0);
const clampS = (s) => Math.max(0, Math.min(5, Math.round(+s || 0)));
const emptyVote = () => ({ up: 0, down: 0, sum: 0, n: 0 });

export default function registrar(r) {
  r.get('/api/votos', async ({ res, url, pool }) => {
    const ids = (url.searchParams.get('ids') || '').split(',').filter((i) => VOTE_ID.test(i)).slice(0, 60);
    const out = {};
    ids.forEach((i) => { out[i] = emptyVote(); });
    if (ids.length) {
      const { rows } = await pool.query('SELECT id, up, down, sum, n FROM votos_legado WHERE id = ANY($1)', [ids]);
      rows.forEach((x) => { out[x.id] = { up: x.up, down: x.down, sum: x.sum, n: x.n }; });
    }
    return send(res, 200, out);
  });

  r.post('/api/votos', async ({ req, res, pool, ip }) => {
    if (limited('v:' + ip, 120)) return send(res, 429, { erro: 'Muitas ações. Aguarde um pouco.' });
    const b = await lerJson(req);
    if (b === undefined) return send(res, 400, { erro: 'json inválido' });
    if (!b || !VOTE_ID.test(b.id || '')) return send(res, 400, { erro: 'id inválido' });
    let dUp = 0, dDown = 0, dSum = 0, dN = 0;
    if ('from' in b || 'to' in b) {
      const f = clampV(b.from), t = clampV(b.to);
      if (f === 1) dUp--; if (f === -1) dDown--;
      if (t === 1) dUp++; if (t === -1) dDown++;
    }
    if ('starFrom' in b || 'starTo' in b) {
      const f = clampS(b.starFrom), t = clampS(b.starTo);
      if (f) { dSum -= f; dN--; }
      if (t) { dSum += t; dN++; }
    }
    const { rows } = await pool.query(
      `INSERT INTO votos_legado (id, up, down, sum, n) VALUES ($1, GREATEST($2,0), GREATEST($3,0), GREATEST($4,0), GREATEST($5,0))
       ON CONFLICT (id) DO UPDATE SET up = GREATEST(votos_legado.up + $2, 0), down = GREATEST(votos_legado.down + $3, 0),
         sum = GREATEST(votos_legado.sum + $4, 0), n = GREATEST(votos_legado.n + $5, 0)
       RETURNING up, down, sum, n`, [b.id, dUp, dDown, dSum, dN]);
    return send(res, 200, rows[0]);
  });
}
