// Visualizações reais dos vídeos, direto da YouTube Data API v3.
// GET /api/yt-stats?ids=ID1,ID2 -> { ID1:{views,likes}, ... }
// Precisa da variável de ambiente YT_API_KEY no Netlify.
const YT = /^[\w-]{11}$/;
export default async (req) => {
  const key = process.env.YT_API_KEY;
  const ids = [...new Set((new URL(req.url).searchParams.get("ids") || "").split(",").filter(i => YT.test(i)))].slice(0, 50);
  const head = { "content-type": "application/json" };
  if (!key || !ids.length) return new Response("{}", { headers: { ...head, "cache-control": "no-store" } });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}&key=${key}`);
  if (!r.ok) return new Response("{}", { status: 502, headers: head });
  const d = await r.json(), out = {};
  for (const it of d.items || []) out[it.id] = { views: +it.statistics.viewCount || 0, likes: +it.statistics.likeCount || 0 };
  // cache de 6h na CDN da Netlify para não gastar a cota da API
  return new Response(JSON.stringify(out), { headers: { ...head, "cache-control": "public, max-age=600", "netlify-cdn-cache-control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
};
export const config = { path: "/api/yt-stats" };
