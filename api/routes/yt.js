// Estatísticas do YouTube (opcional: sem YT_API_KEY devolve {}).
import { send } from '../lib/http.js';

const ytCache = new Map(); // id -> { at, data }
async function ytStats(ytKey, ids) {
  const out = {};
  if (!ytKey) return out;
  const now = Date.now();
  const need = ids.filter((i) => !ytCache.has(i) || now - ytCache.get(i).at > 6 * 3600 * 1000);
  if (need.length) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${need.join(',')}&key=${ytKey}`);
    if (r.ok) {
      const d = await r.json();
      for (const it of d.items || []) ytCache.set(it.id, { at: now, data: { views: +it.statistics.viewCount || 0, likes: +it.statistics.likeCount || 0 } });
    }
  }
  for (const i of ids) if (ytCache.has(i)) out[i] = ytCache.get(i).data;
  return out;
}

export default function registrar(r) {
  r.get('/api/yt-stats', async ({ res, url, ytKey }) => {
    const ids = [...new Set((url.searchParams.get('ids') || '').split(',').filter((i) => /^[\w-]{11}$/.test(i)))].slice(0, 50);
    return send(res, 200, ids.length ? await ytStats(ytKey, ids) : {}, { 'Cache-Control': 'public, max-age=600' });
  });
}
