// Votos compartilhados (curtir / não curtir / estrelas) guardados no Netlify Blobs.
// GET  /api/votos?ids=a,b        -> { a:{up,down,sum,n}, b:{...} }
// POST /api/votos {id,from,to}   -> muda o voto de -1/0/1 para -1/0/1
// POST /api/votos {id,starFrom,starTo} -> muda a nota de 0..5 para 0..5
import { getStore } from "@netlify/blobs";

const ID = /^[a-z0-9-]{1,80}$/;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const empty = () => ({ up: 0, down: 0, sum: 0, n: 0 });
const clampV = v => (v === 1 || v === -1 ? v : 0);
const clampS = s => Math.max(0, Math.min(5, Math.round(+s || 0)));

export default async (req) => {
  const store = getStore({ name: "votos", consistency: "strong" });
  if (req.method === "GET") {
    const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter(i => ID.test(i)).slice(0, 60);
    const out = {};
    await Promise.all(ids.map(async id => { out[id] = (await store.get(id, { type: "json" })) || empty(); }));
    return json(out);
  }
  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return json({ erro: "json inválido" }, 400); }
    if (!b || !ID.test(b.id || "")) return json({ erro: "id inválido" }, 400);
    // tenta algumas vezes para não perder votos simultâneos
    for (let i = 0; i < 5; i++) {
      const cur = await store.getWithMetadata(b.id, { type: "json" });
      const t = cur?.data || empty();
      if ("from" in b || "to" in b) {
        const f = clampV(b.from), to = clampV(b.to);
        if (f === 1) t.up--; if (f === -1) t.down--;
        if (to === 1) t.up++; if (to === -1) t.down++;
      }
      if ("starFrom" in b || "starTo" in b) {
        const f = clampS(b.starFrom), to = clampS(b.starTo);
        if (f) { t.sum -= f; t.n--; }
        if (to) { t.sum += to; t.n++; }
      }
      for (const k of ["up", "down", "sum", "n"]) t[k] = Math.max(0, t[k]);
      const opts = cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
      const r = await store.setJSON(b.id, t, opts);
      if (r?.modified !== false) return json(t);
    }
    return json({ erro: "tente de novo" }, 409);
  }
  return json({ erro: "método não permitido" }, 405);
};

export const config = { path: "/api/votos" };
