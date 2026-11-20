// Editar perfil no celular (perfil.html) + achados do perfil, com a API mockada via page.route.
// Roda com arquivo explícito: node --test tests/front-perfil-mobile.test.js (precisa do Playwright; sem ele os testes são pulados).
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

const GATO = { fur: 1, pat: 0, eye: 2, acc: 3, clo: 0, bg: 4 };
const PAT = { id: "banda_larga", nome: "Banda larga", xp_minimo: 150, cor: "#2fbf5b" };
const RAR = ["Mítico", "Lendário", "Relíquia", "Raro", "Relevante", "Comum"];
const CARTAS = Array.from({ length: 14 }, (_, i) => ({ id: `memes-${i}`, colecao_id: i % 2 ? "orkut" : "memes", numero: i + 1, nome: i === 3 ? "Um nome de carta bem comprido para quebrar linha" : `Carta ${i + 1}`, emoji: "🎀", raridade: RAR[i % 6], meme_id: null }));
const COLECOES = [
  { id: "memes", nome: "Memes Icônicos", total: 20, tenho: 7, completa: false },
  { id: "orkut", nome: "Orkut e MSN da Nostalgia", total: 20, tenho: 3, completa: false },
  { id: "tv", nome: "TV Aberta", total: 20, tenho: 1, completa: false }
];

async function abrir(layout, vp, { recados = [] } = {}) {
  const st = { patches: [], fav: null, layout };
  const eu = () => ({ id: 1, apelido: "Ana", avatar_gato: GATO, avatar_url: null, usar_foto: false, cadastro_completo: true, perfil_layout: st.layout, carta_favorita: st.fav });
  const json = (route, status, corpo) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(corpo) });
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 600, isMobile: vp.width < 600 });
  await ctx.route((url) => url.hostname !== "127.0.0.1", (r) => r.abort());
  await ctx.route("**/api/**", async (route) => {
    const req = route.request(), p = decodeURIComponent(new URL(req.url()).pathname), m = req.method();
    if (p === "/api/eu" && m === "GET") return json(route, 200, { usuario: eu(), patente: PAT, proxima_patente: null, moedas: 10, xp: 200, csrf: "tok" });
    if (p === "/api/eu" && m === "PATCH") { const c = JSON.parse(req.postData() || "{}"); st.patches.push(c); if (c.perfil_layout) st.layout = c.perfil_layout; if ("carta_favorita" in c) st.fav = CARTAS.find((x) => x.id === c.carta_favorita) || null; return json(route, 200, { usuario: eu(), pacote_boas_vindas: null }); }
    if (/^\/api\/perfil\/ana\/recados$/i.test(p)) return json(route, 200, { itens: recados });
    if (p.toLowerCase() === "/api/perfil/ana") return json(route, 200, { perfil: { apelido: "Ana", avatar_gato: GATO, avatar_url: null, layout: st.layout, membro_desde: "2026-11-01T12:00:00Z", eh_meu: true }, patente: { id: PAT.id, nome: PAT.nome, cor: PAT.cor }, proxima_patente: { nome: "Fibra", faltam: 50 }, xp: 200, carta_favorita: st.fav, recados: recados.length, album: { total: 120, tenho: CARTAS.length, colecoes_completas: 0, colecoes: COLECOES, cartas: CARTAS } });
    if (p === "/api/carteira") return json(route, 200, { usuario: { id: 1, apelido: "Ana" }, moedas: 10, xp: 200, patente: PAT, proxima_patente: null, pacotes: [], cartas: { distintas: 2, total_no_album: 120, quantidade_total: 2, repetidas: 0 }, valor_das_repetidas: 0 });
    if (p === "/api/visita") return json(route, 200, { dia: "2026-11-20", primeira_visita_do_dia: false, xp_ganho: 0, pacotes_ganhos: [], carteira: { xp: 200, moedas: 10 } });
    if (p === "/api/album") return json(route, 200, { colecoes: [], total: 0, tenho: 0, colecoes_completas: 0 });
    if (p === "/api/pacotes/tipos") return json(route, 200, { itens: [] });
    if (p === "/api/eventos") return json(route, 202, { ok: true });
    return json(route, 404, { erro: "não mockado" });
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) erros.push("console: " + m.text()); });
  await page.goto(base + "/perfil.html?u=Ana");
  await page.waitForSelector("[data-ed=visual]");
  return { ctx, page, st, erros };
}
const VPS = [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1280, height: 900 }];
const VISUAIS = ["orkut", "tiktok", "whatsapp", "facebook", "instagram", "msn", "kwai", "homepage"];

for (const vp of VPS) {
  for (const layout of VISUAIS) {
    test(`editar perfil ${vp.width}px, visual ${layout}: Salvar sempre visível, visual atual visível, favorita por mini-cartas, foco e Esc`, opts, async () => {
      const { ctx, page, st, erros } = await abrir(layout, vp);
      await page.click("[data-ed=visual]");
      await page.waitForSelector("#dlg[open]");
      const dentro = async (sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5; });
      // rodapé visível com o corpo no topo e depois rolado até o fim
      assert.ok(await dentro("#btSalvar"), "Salvar visível ao abrir");
      assert.ok(await dentro("#btCancelar"), "Cancelar visível ao abrir");
      await page.$eval("#dlgCorpo", (e) => { e.scrollTop = e.scrollHeight; });
      assert.ok(await dentro("#btSalvar"), "Salvar visível no fim do corpo");
      await page.$eval("#dlgCorpo", (e) => { e.scrollTop = 0; });
      // altura mínima de toque dos botões do rodapé
      for (const id of ["#btSalvar", "#btCancelar", "#btGato"]) assert.ok((await page.$eval(id, (e) => e.getBoundingClientRect().height)) >= 44, id + " >= 44px");
      // visual atual: marcado, com foco, e visível dentro da fileira
      const foco = await page.evaluate(() => { const a = document.activeElement; return a && a.name === "lay" && a.checked && a.value; });
      assert.strictEqual(foco, layout, "foco inicial no visual atual");
      const vis = await page.$eval("#lays input:checked", (i) => { const l = i.closest("label").getBoundingClientRect(), c = document.getElementById("lays").getBoundingClientRect(); return l.left >= c.left - 1 && l.right <= c.right + 1; });
      assert.ok(vis, "visual escolhido visível na fileira");
      if (vp.width <= 520) {
        assert.strictEqual(await page.$eval("#lays", (e) => getComputedStyle(e).display), "flex", "carrossel em 1 linha");
        const tops = await page.$$eval("#lays .pf-lay", (l) => new Set(l.map((x) => Math.round(x.getBoundingClientRect().top))).size);
        assert.strictEqual(tops, 1, "1 linha só");
        const alt = await page.$$eval("#lays .pf-lay", (l) => new Set(l.map((x) => Math.round(x.getBoundingClientRect().height))).size);
        assert.strictEqual(alt, 1, "cartões com a mesma altura");
        const nm = await page.$$eval("#lays .pf-lay .nm", (l) => new Set(l.map((x) => Math.round(x.getBoundingClientRect().height))).size);
        assert.strictEqual(nm, 1, "legendas com a mesma altura");
        assert.ok(await page.$eval("#lays", (e) => e.scrollWidth > e.clientWidth), "há o que rolar");
        assert.ok(await page.$eval("#fav", (e) => e.scrollWidth > e.clientWidth), "mini-cartas rolam na horizontal");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem overflow horizontal");
        assert.ok(await page.$eval("#dlg", (d) => d.getBoundingClientRect().height <= innerHeight), "diálogo cabe na tela");
      }
      // carta favorita: radiogroup de mini-cartas, sem <select>
      assert.strictEqual(await page.$("select#fav"), null);
      assert.strictEqual(await page.getAttribute("#fav", "role"), "radiogroup");
      assert.strictEqual(await page.$$eval("#fav input[name=fav]", (l) => l.length), CARTAS.length + 1);
      assert.strictEqual(await page.$$eval("#fav label .pf-carta", (l) => l.length), CARTAS.length);
      assert.strictEqual(await page.$eval("#fav input:checked", (i) => i.value), "", "Nenhuma marcada");
      await page.click("#fav label:nth-of-type(6)");
      assert.strictEqual(await page.$eval("#fav input:checked", (i) => i.value), await page.$eval("#fav label:nth-of-type(6) input", (i) => i.value));
      assert.ok(await page.$eval("#fav label:nth-of-type(6)", (l) => l.getAttribute("aria-checked") === null && l.querySelector("input").checked));
      // Esc fecha
      await page.keyboard.press("Escape");
      assert.strictEqual(await page.$eval("#dlg", (d) => d.open), false);
      // reabre, escolhe e salva
      await page.click("[data-ed=visual]");
      const esperado = await page.$eval("#fav label:nth-of-type(3) input", (i) => i.value);
      await page.click("#fav label:nth-of-type(3)");
      await page.click("#btSalvar");
      await page.waitForFunction(() => !document.getElementById("dlg").open);
      assert.deepStrictEqual(st.patches.at(-1), { perfil_layout: layout, carta_favorita: esperado });
      assert.deepStrictEqual(erros, []);
      await ctx.close();
    });
  }
}

test("trocar o visual no carrossel mobile e salvar manda o visual novo", opts, async () => {
  const { ctx, page, st, erros } = await abrir("orkut", VPS[0]);
  await page.click("[data-ed=visual]");
  await page.locator('#lays input[value="bluesky"]').evaluate((i) => i.closest("label").scrollIntoView({ inline: "center", block: "nearest" }));
  await page.click('#lays label.l-bluesky');
  await page.click("#btSalvar");
  await page.waitForSelector(".pf-bluesky");
  assert.strictEqual(st.patches.at(-1).perfil_layout, "bluesky");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("setas no radiogroup dos visuais trocam o marcado", opts, async () => {
  const { ctx, page } = await abrir("orkut", VPS[0]);
  await page.click("[data-ed=visual]");
  await page.keyboard.press("ArrowRight");
  assert.notStrictEqual(await page.$eval("#lays input:checked", (i) => i.value), "orkut");
  await ctx.close();
});

for (const vp of VPS) {
  test(`cartas do perfil: textos >= 11px (${vp.width}px)`, opts, async () => {
    const { ctx, page, erros } = await abrir("orkut", vp);
    await page.waitForSelector(".pf-carta .ft");
    const menores = await page.$$eval(".pf-carta .tp, .pf-carta .tp em, .pf-carta .nm, .pf-carta .ft", (l) => l.map((e) => parseFloat(getComputedStyle(e).fontSize)).filter((n) => n < 11));
    assert.deepStrictEqual(menores, []);
    assert.deepStrictEqual(erros, []);
    await ctx.close();
  });

  test(`TikTok: stories sem scrollbar nativa e rótulo legível (${vp.width}px)`, opts, async () => {
    const { ctx, page, erros } = await abrir("tiktok", vp);
    await page.waitForSelector(".pf-dest .d");
    const r = await page.$eval(".pf-dest", (e) => ({ sb: getComputedStyle(e).scrollbarWidth, fz: parseFloat(getComputedStyle(e.querySelector(".d")).fontSize), folga: e.offsetHeight - e.clientHeight }));
    assert.strictEqual(r.sb, "none"); assert.ok(r.fz >= 12); assert.strictEqual(r.folga, 0, "sem barra ocupando altura");
    const rot = await page.$$eval(".pf-dest .d b", (l) => l.map((b) => ({ t: b.textContent, title: b.title, h: b.getBoundingClientRect().height, clamp: getComputedStyle(b).webkitLineClamp })));
    assert.ok(rot.every((x) => x.title === x.t && x.clamp === "2"));
    assert.deepStrictEqual(erros, []);
    await ctx.close();
  });
}

test("WhatsApp mobile: mural vazio sem ~400px de papel de parede e identidade antes do chat", opts, async () => {
  const { ctx, page, erros } = await abrir("whatsapp", VPS[0]);
  await page.waitForSelector(".pf-whatsapp .chat.vazio");
  const r = await page.evaluate(() => { const c = document.querySelector(".pf-whatsapp .chat").getBoundingClientRect(), i = document.querySelector(".pf-whatsapp .info").getBoundingClientRect(); return { ch: c.height, chTop: c.top, infoTop: i.top }; });
  assert.ok(r.ch < 300, "chat vazio compacto: " + r.ch);
  assert.ok(r.infoTop < r.chTop, "identidade antes do chat no mobile");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("WhatsApp desktop com recados mantém o chat alto", opts, async () => {
  const rec = [{ id: 1, texto: "oi", em: "2026-11-20T10:00:00Z", autor: { apelido: "Caio", avatar_gato: GATO, avatar_url: null }, pode_apagar: false }];
  const { ctx, page } = await abrir("whatsapp", VPS[2], { recados: rec });
  await page.waitForSelector(".pf-whatsapp .chat");
  assert.ok(await page.$eval(".pf-whatsapp .chat", (e) => e.getBoundingClientRect().height >= 520));
  await ctx.close();
});

for (const vp of VPS.slice(0, 2)) {
  test(`Facebook ${vp.width}px: abas role=tab, aria-selected e >= 44px de altura`, opts, async () => {
    const { ctx, page, erros } = await abrir("facebook", vp);
    await page.waitForSelector(".abas");
    assert.strictEqual(await page.getAttribute(".abas", "role"), "tablist");
    const abas = await page.$$eval(".abas [role=tab]", (l) => l.map((a) => ({ sel: a.getAttribute("aria-selected"), h: a.getBoundingClientRect().height, w: a.getBoundingClientRect().width })));
    assert.strictEqual(abas.length, 3);
    assert.ok(abas.every((a) => a.h >= 44 && a.w >= 44), JSON.stringify(abas));
    assert.deepStrictEqual(abas.map((a) => a.sel), ["true", "false", "false"]);
    await page.click("#ab-fotos");
    assert.deepStrictEqual(await page.$$eval(".abas [role=tab]", (l) => l.map((a) => a.getAttribute("aria-selected"))), ["false", "false", "true"]);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem overflow horizontal");
    assert.deepStrictEqual(erros, []);
    await ctx.close();
  });
}
