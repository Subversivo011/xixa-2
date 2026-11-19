// GET /api/health: processo de pé + banco respondendo (503 se o banco falhar).
import { send } from '../lib/http.js';

export default function registrar(r) {
  r.get('/api/health', async ({ res, pool }) => {
    try {
      await Promise.race([
        pool.query('SELECT 1'),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000).unref())
      ]);
      return send(res, 200, { ok: true, banco: 'ok' });
    } catch (e) {
      console.error(new Date().toISOString(), 'health: banco indisponível:', e.message);
      return send(res, 503, { ok: false, banco: 'falha' });
    }
  });
}
