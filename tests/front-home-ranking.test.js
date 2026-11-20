// Home (index.html): ranking Sobe.Desce sem exceção no console (logado e convidado) e abas com >= 44px no celular.
// API mockada via page.route. Roda com arquivo explícito: node --test tests/front-home-ranking.test.js
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

let chromium = null;
for (const m of [process.env.PLAYWRIGHT_MODULE, "playwright"]) {
  if (!m) continue;
  try { ({ chromium } = require(m)); break; } catch { /* tenta o próximo */ }
}
const RAIZ = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const servidor = () => new Promise((ok) => {
  const s = http.createServer((req, res) => {
    const arq = path.join(RAIZ, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(arq)] || "application/octet-stream" });
    fs.createReadStream(arq).pipe(res);
  }).listen(0, "127.0.0.1", () => ok(s));
});
const opts = { skip: chromium ? false : "playwright não instalado" };
let srv, browser, base;
test.before(async () => {
  if (!chromium) return;
  srv = await servidor(); base = `http://127.0.0.1:${srv.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(async () => { if (browser) await browser.close(); if (srv) srv.close(); });

const IDS = [...fs.readFileSync(path.join(RAIZ, "data.js"), "utf8").matchAll(/"id":"([a-z0-9_-]+)"/g)].map((m) => m[1]);
const PAT = { id: "banda_larga", nome: "Banda larga", xp_minimo: 150, cor: "#2fbf5b" };
const COM_DADOS = {
  sobe: IDS.slice(0, 5).map((id, i) => ({ id, hoje: 5 - i, ontem: 2, total: 50 - i })),
  desce: IDS.slice(5, 10).map((id, i) => ({ id, hoje: 0, ontem: 3 + i, total: 4 + i }))
};

async function abrir({ convidado = false, vp = { width: 390, height: 844 }, dados = COM_DADOS, sdSalvo = null } = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(([c, sd]) => {
    try { if (c) localStorage.setItem("ns_convidado", "1"); if (sd) localStorage.setItem("ns_sd", sd); } catch (e) { /* sem storage */ }
  }, [convidado, sdSalvo]);
  await ctx.route((url) => url.hostname !== "127.0.0.1", (r) => r.abort());
  const json = (route, status, corpo) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(corpo) });
  const chamadas = [];
  await ctx.route("**/api/**", async (route) => {
    const u = new URL(route.request().url()), p = u.pathname;
    if (p === "/api/sobedesce") { chamadas.push(u.search); return json(route, 200, { tipo: "visita", periodo: "hoje", ...dados }); }
    if (p === "/api/eu") return convidado ? json(route, 401, { erro: "entre" }) : json(route, 200, { usuario: { id: 1, apelido: "teste", avatar_gato: null, avatar_url: null }, patente: PAT, proxima_patente: null, moedas: 5, xp: 10, csrf: "t" });
    if (p === "/api/visita") return json(route, 200, { dia: "2026-11-20", primeira_visita_do_dia: false, xp_ganho: 0, pacotes_ganhos: [], carteira: { xp: 10, moedas: 5 } });
    if (p === "/api/carteira") return json(route, 200, { usuario: { id: 1, apelido: "teste" }, moedas: 5, xp: 10, patente: PAT, proxima_patente: null, pacotes: [], cartas: { distintas: 0, total_no_album: 120, quantidade_total: 0, repetidas: 0 }, valor_das_repetidas: 0 });
    if (p === "/api/album") return json(route, 200, { colecoes: [], total: 0, tenho: 0, colecoes_completas: 0 });
    if (p === "/api/pacotes/tipos") return json(route, 200, { itens: [] });
    if (p === "/api/eventos") return json(route, 202, { ok: true });
    return json(route, 404, { erro: "não mockado" });
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) erros.push("console: " + m.text()); });
  await page.goto(base + "/index.html");
  await page.waitForSelector("#hot .sd-tabs");
  return { ctx, page, erros, chamadas };
}

for (const [rotulo, convidado] of [["logado", false], ["convidado (ns_convidado=1)", true]]) {
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    test(`home ${rotulo} ${vp.width}px: Sobe.Desce de hoje e de todos os tempos, visitados e clicados, sem erro no console`, opts, async () => {
      const { ctx, page, erros } = await abrir({ convidado, vp });
      await page.waitForSelector("#hot .sd-i");
      assert.strictEqual(await page.$$eval("#hot .sd-i.up", (l) => l.length), 5);
      assert.strictEqual(await page.$$eval("#hot .sd-i.dn", (l) => l.length), 5);
      for (const [alvo, qual] of [["periodo", 2], ["tipo", 2], ["periodo", 1], ["tipo", 1], ["periodo", 2]]) {
        await page.click(alvo === "periodo" ? `#hot .sd-seg button:nth-child(${qual})` : `#hot .sd-tabs button:nth-child(${qual})`);
        await page.waitForSelector("#hot .sd-i");
        assert.ok((await page.$$eval("#hot .sd-i", (l) => l.length)) > 0);
      }
      // rajada de renders concorrentes
      await page.evaluate(async () => { SD.cache = {}; await Promise.all([1, 2, 3, 4, 5].map(() => renderSobeDesce())); });
      assert.strictEqual(await page.$$eval("#hot .sd", (l) => l.length), 1, "um único bloco .sd");
      // o relógio da home (setInterval de 15 s) roda sem exceção
      assert.ok(await page.evaluate(() => !!document.getElementById("timer")));
      assert.deepStrictEqual(erros, []);
      await ctx.close();
    });
  }
}

test("home com o ranking vazio (sem dados hoje) também não dá erro", opts, async () => {
  const { ctx, page, erros } = await abrir({ dados: { sobe: [], desce: [] } });
  await page.waitForSelector("#hot .sd-vz");
  await page.click("#hot .sd-seg button:nth-child(2)");
  await page.click("#hot .sd-tabs button:nth-child(2)");
  assert.ok((await page.$$eval("#hot .sd-vz", (l) => l.length)) >= 2);
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("home com ns_sd salvo inválido no localStorage não quebra o ranking", opts, async () => {
  const { ctx, page, erros } = await abrir({ sdSalvo: JSON.stringify({ tipo: "xyz", periodo: "abc" }) });
  await page.waitForSelector("#hot .sd");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
  test(`abas do ranking >= 44px de altura no celular (${vp.width}px)`, opts, async () => {
    const { ctx, page, erros } = await abrir({ vp });
    const alturas = await page.$$eval("#hot .sd-seg button, #hot .sd-tabs button", (l) => l.map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width })));
    assert.strictEqual(alturas.length, 4);
    assert.ok(alturas.every((a) => a.h >= 44 && a.w >= 44), JSON.stringify(alturas));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem overflow horizontal");
    assert.deepStrictEqual(erros, []);
    await ctx.close();
  });
}

test("no desktop as abas continuam compactas (sem regressão visual)", opts, async () => {
  const { ctx, page } = await abrir({ vp: { width: 1280, height: 900 } });
  const h = await page.$eval("#hot .sd-tabs button", (b) => b.getBoundingClientRect().height);
  assert.ok(h < 44, "desktop mantém a altura compacta: " + h);
  await ctx.close();
});
