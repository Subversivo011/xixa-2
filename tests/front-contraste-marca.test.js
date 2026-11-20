// Contraste do azul da marca (texto >= 4,5:1 em claro e escuro), botão primário, fontes >= 12px, aria-controls das abas da home,
// logo com width/height, margem da faixa facts. Contraste calculado pelos tokens E medido no navegador (texto sobre gradiente por pixel).
// Roda com arquivo explícito: node --test tests/front-contraste-marca.test.js
// Precisa do Playwright (npm i playwright; npx playwright install chromium). Sem ele os testes de navegador são pulados.
// Se estiver instalado fora do projeto: PLAYWRIGHT_MODULE=/caminho/node_modules/playwright
// Navegador já baixado em outro lugar: CHROMIUM_PATH=/caminho/chrome
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

// ---------- 1) tokens (sem navegador) ----------
const hex = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const css = fs.readFileSync(path.join(RAIZ, "theme.css"), "utf8");
const bloco = (re) => { const m = re.exec(css); assert.ok(m, "bloco de tokens não encontrado: " + re); const t = {}; for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\b/g)) t[k] = v.slice(0, 7); return t; };
const TEMAS = { claro: bloco(/:root,:root\[data-theme="light"\]\{([\s\S]*?)\n\}/), escuro: bloco(/:root\[data-theme="dark"\]\{([\s\S]*?)\n\}/) };

for (const [nome, t] of Object.entries(TEMAS)) {
  test(`tokens (${nome}): --brand-text >= 4,5:1 sobre os fundos de texto; --brand-display >= 3:1; texto sobre botão >= 4,5:1`, () => {
    for (const fundo of ["bg", "panel", "panel2", "sunk", "brand-soft"]) assert.ok(cr(t["brand-text"], t[fundo]) >= 4.5, `${nome}: brand-text sobre ${fundo} = ${cr(t["brand-text"], t[fundo]).toFixed(2)}`);
    assert.ok(cr(t["brand-display"], t.bg) >= 3, `${nome}: brand-display (texto grande) sobre bg = ${cr(t["brand-display"], t.bg).toFixed(2)}`);
    for (const fundo of ["brand-fill", "btn-a", "btn-b"]) assert.ok(cr(t["on-brand"], t[fundo]) >= 4.5, `${nome}: on-brand sobre ${fundo} = ${cr(t["on-brand"], t[fundo]).toFixed(2)}`);
    for (const fundo of ["bg", "panel", "panel2", "brand-soft"]) assert.ok(cr(t["gold-text"], t[fundo]) >= 4.5, `${nome}: gold-text sobre ${fundo}`);
    for (const fundo of ["bg", "panel", "panel2"]) assert.ok(cr(t.faint, t[fundo]) >= 4.5, `${nome}: faint sobre ${fundo} = ${cr(t.faint, t[fundo]).toFixed(2)}`);
  });
}

// ---------- 2) navegador ----------
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

async function abrir(pagina, { w, h, tema }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route((u) => u.hostname !== "127.0.0.1", (r) => r.abort());
  await ctx.route("**/api/**", (r) => r.fulfill({ status: 401, contentType: "application/json", body: '{"erro":"x"}' }));
  await ctx.addInitScript((t) => { try { localStorage.setItem("ns_convidado", "1"); localStorage.setItem("ns_theme", t); } catch (e) { /* sem storage */ } }, tema);
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) erros.push("console: " + m.text()); });
  await page.goto(base + pagina);
  await page.waitForSelector(".nsft2 .fq-in, .lt-it");
  await page.waitForTimeout(1200); // transições e animações de entrada terminam
  return { ctx, page, erros };
}

/** todo texto visível: cor efetiva x fundo sólido (texto sobre gradiente é medido por pixel, em outro teste) */
const medir = () => {
  const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const L = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const mix = (f, b, a) => ({ r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a), a: 1 });
  const bgDe = (el) => { const pilha = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== "none") return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { pilha.push(c); if (c.a > 0.95) break; } } let base = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; for (let i = pilha.length - 1; i >= 0; i--) base = mix(pilha[i], base, pilha[i].a); return base; };
  const opac = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const sel = (e) => { const p = []; for (let x = e, i = 0; x && x.tagName && i < 3; x = x.parentElement, i++) p.unshift(x.tagName.toLowerCase() + (x.id ? "#" + x.id : "") + (typeof x.className === "string" && x.className ? "." + x.className.trim().split(/\s+/).slice(0, 2).join(".") : "")); return p.join(" > "); };
  const falhas = [], pequenas = [], vistos = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.nodeValue.trim(); if (!t) continue;
    const e = n.parentElement; if (!e || vistos.has(e) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(e.tagName)) continue; vistos.add(e);
    const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none") continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (e.closest("button:disabled,[disabled],[aria-hidden=true],.vw,#sgm:not(.open)")) continue;
    const px = parseFloat(cs.fontSize);
    if (px < 1) continue; // texto escondido de propósito (ano ativo da régua no celular: o nome acessível continua no DOM)
    if (px < 12) pequenas.push(sel(e) + " " + px + "px | " + t.slice(0, 20));
    const fg = parse(cs.color), bg = bgDe(e); if (!fg || !bg) continue;
    const o = opac(e); if (o < 0.05) continue; // ainda animando de entrada
    const ef = mix(fg, bg, fg.a * o), x = L(ef), y = L(bg), ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    const grande = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700);
    if (ratio < (grande ? 3 : 4.5)) falhas.push(`${sel(e)} | ${cs.color} | ${px}px | ${ratio.toFixed(2)} | ${t.slice(0, 20)}`);
  }
  return { falhas, pequenas };
};
// o que fica de fora, com justificativa: arte das cartas travadas ("???" é placeholder), cores semânticas de raridade,
// e o visual de época da linha do tempo (cada época tem paleta própria, fora do azul da marca)
const FORA = /card\.lock|\.kv > b|\.kv b|chipR|\.lt-stage|ep-fb|\.lt-top|\.lt-marcas|\.lt-chips/;

for (const pagina of ["/index.html", "/album.html", "/memepedia.html"]) for (const tema of ["light", "dark"]) for (const [w, h] of [[1280, 900], [390, 844]]) {
  test(`texto >= 4,5:1 e fontes >= 12px: ${pagina} (${tema}, ${w}px)`, opts, async () => {
    const { ctx, page, erros } = await abrir(pagina, { w, h, tema });
    const r = await page.evaluate(medir);
    const f = r.falhas.filter((x) => !FORA.test(x)), p = r.pequenas.filter((x) => !FORA.test(x));
    assert.deepStrictEqual(f, [], "contraste < 4,5:1:\n" + f.join("\n"));
    assert.deepStrictEqual(p, [], "fontes < 12px:\n" + p.join("\n"));
    assert.deepStrictEqual(erros, []);
    await ctx.close();
  });
}

test("linha do tempo: cabeçalho da página e seletor de anos sem o azul vivo como texto pequeno (claro e escuro)", opts, async () => {
  for (const tema of ["light", "dark"]) {
    const { ctx, page } = await abrir("/linha-do-tempo.html#2012", { w: 1280, h: 900, tema });
    const r = await page.evaluate(medir);
    const f = r.falhas.filter((x) => /rl-arr|lt-yrs|\.ry/.test(x));
    assert.deepStrictEqual(f, [], tema + ": " + f.join("\n"));
    const p = r.pequenas.filter((x) => /lt-yrs|\.ry|lt-rail|lt-top|lt-foot|\.yb|lt-tick/.test(x));
    assert.deepStrictEqual(p, [], tema + " fontes: " + p.join("\n"));
    await ctx.close();
  }
});

// ---------- texto sobre gradiente: por pixel ----------
async function contrastePorPixel(page, el, corTexto) {
  await el.scrollIntoViewIfNeeded();
  const estilo = await page.addStyleTag({ content: "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}" });
  const semTexto = (await el.screenshot()).toString("base64");
  await estilo.evaluate((n) => n.parentNode.removeChild(n));
  const comTexto = (await el.screenshot()).toString("base64");
  return page.evaluate(async ({ a, b, cor }) => {
    const dec = async (x) => { const bmp = await createImageBitmap(await (await fetch("data:image/png;base64," + x)).blob()); const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height; const g = c.getContext("2d"); g.drawImage(bmp, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
    const [fundo, texto] = [await dec(a), await dec(b)];
    const m = /rgba?\(([^)]+)\)/.exec(cor), t = m[1].split(/[ ,\/]+/).map(Number);
    const L = (r, g, bl) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
    // pixels do núcleo do glifo = os que mais mudaram ao esconder o texto (vale também com filtros de hover), só no miolo do botão
    const m8 = 8, dif = [];
    let maxd = 0;
    for (let i = 0; i < texto.data.length; i += 4) {
      const px = (i / 4) % texto.width, py = Math.floor(i / 4 / texto.width);
      if (px < m8 || py < m8 || px >= texto.width - m8 || py >= texto.height - m8) { dif.push(0); continue; }
      const d = Math.hypot(texto.data[i] - fundo.data[i], texto.data[i + 1] - fundo.data[i + 1], texto.data[i + 2] - fundo.data[i + 2]);
      dif.push(d); if (d > maxd) maxd = d;
    }
    const rs = [];
    for (let i = 0; i < texto.data.length; i += 4) {
      if (dif[i / 4] < maxd * 0.85 || dif[i / 4] < 30) continue;
      const x = L(texto.data[i], texto.data[i + 1], texto.data[i + 2]), y = L(fundo.data[i], fundo.data[i + 1], fundo.data[i + 2]);
      rs.push((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05));
    }
    rs.sort((p, q) => p - q);
    return { n: rs.length, min: rs[0], mediana: rs[Math.floor(rs.length / 2)] };
  }, { a: semTexto, b: comTexto, cor: corTexto });
}

for (const tema of ["light", "dark"]) {
  test(`botões primários (texto sobre gradiente) >= 4,5:1 medido por pixel, em repouso e com hover (${tema})`, opts, async () => {
    const { ctx, page } = await abrir("/index.html", { w: 1280, h: 900, tema });
    const alvos = [["Explorar por ano", ".hero .btn:not(.ghost)"], ["Enviar meme (cabeçalho)", ".sub .cta"]];
    const falhas = [];
    for (const [nome, sel] of alvos) {
      const el = (await page.$$(sel))[0];
      if (!el) { falhas.push(nome + ": não encontrado"); continue; }
      for (const estado of ["repouso", "hover"]) {
        if (estado === "hover") { await el.hover(); await page.waitForTimeout(300); } else { await page.mouse.move(2, 2); await page.waitForTimeout(300); }
        const cor = await el.evaluate((e) => getComputedStyle(e).color);
        const r = await contrastePorPixel(page, el, cor);
        if (r.n < 20 || r.min < 4.5) falhas.push(`${nome} ${estado}: n=${r.n} min=${r.min && r.min.toFixed(2)}`);
      }
    }
    assert.deepStrictEqual(falhas, []);
    await ctx.close();
  });
}

test("hover dos links e botões de marca mantém >= 4,5:1 (claro e escuro)", opts, async () => {
  for (const tema of ["light", "dark"]) {
    const { ctx, page } = await abrir("/index.html", { w: 1280, h: 900, tema });
    const falhas = [];
    for (const sel of [".sec-title a", ".lnk", ".ft-cols button", ".side", ".chip:not(.on)"]) {
      const el = (await page.$$(sel))[0]; if (!el) continue;
      await el.scrollIntoViewIfNeeded(); await el.hover(); await page.waitForTimeout(350);
      const r = await el.evaluate((e) => {
        const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
        const L = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        let bg = null; for (let x = e; x && !bg; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c.a > 0.95) bg = c; }
        bg = bg || parse(getComputedStyle(document.body).backgroundColor);
        const fg = parse(getComputedStyle(e).color), a = fg.a, ef = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
        const x = L(ef), y = L(bg); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      });
      if (r < 4.5) falhas.push(`${tema} ${sel} hover = ${r.toFixed(2)}`);
    }
    assert.deepStrictEqual(falhas, []);
    await ctx.close();
  }
});

// ---------- aria, logo, margem, caixa-alta ----------
test("abas da home ligadas ao painel (aria-controls -> tabpanel) e período em grupo com aria-pressed", opts, async () => {
  const { ctx, page, erros } = await abrir("/index.html", { w: 1280, h: 900, tema: "light" });
  const r = await page.evaluate(() => {
    const painel = document.getElementById("sd-painel");
    return {
      painel: painel && painel.getAttribute("role"), rotulo: painel && painel.getAttribute("aria-labelledby"),
      abas: [...document.querySelectorAll(".sd-tabs [role=tab]")].map((b) => [b.id, b.getAttribute("aria-controls"), b.getAttribute("aria-selected")]),
      periodo: [...document.querySelectorAll(".sd-seg button")].map((b) => [b.getAttribute("aria-controls"), b.getAttribute("aria-pressed")]),
      grupo: document.querySelector(".sd-seg").getAttribute("role")
    };
  });
  assert.strictEqual(r.painel, "tabpanel");
  assert.deepStrictEqual(r.abas.map((a) => a[1]), ["sd-painel", "sd-painel"]);
  assert.strictEqual(r.rotulo, r.abas.find((a) => a[2] === "true")[0], "painel rotulado pela aba ativa");
  assert.ok(r.periodo.every((p) => p[0] === "sd-painel"));
  assert.strictEqual(r.grupo, "group");
  await page.click(".sd-tabs [role=tab]:nth-child(2)");
  await page.waitForTimeout(400);
  assert.strictEqual(await page.getAttribute("#sd-painel", "aria-labelledby"), "sd-tab-clicados");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("logo-word.png com width e height em todas as páginas (sem salto de layout)", opts, async () => {
  for (const pagina of ["/index.html", "/album.html", "/memepedia.html", "/linha-do-tempo.html#2012"]) {
    const { ctx, page } = await abrir(pagina, { w: 1280, h: 900, tema: "light" });
    const r = await page.$$eval('img[src*="logo-word.png"]', (l) => l.map((i) => [i.getAttribute("width"), i.getAttribute("height")]));
    assert.ok(r.length >= 1, pagina + ": logo não encontrado");
    assert.ok(r.every(([w, h]) => w && h), pagina + ": " + JSON.stringify(r));
    await ctx.close();
  }
  const admin = fs.readFileSync(path.join(RAIZ, "admin/index.html"), "utf8");
  assert.match(admin, /<img src="\/logo-word\.png"[^>]*width="\d+"[^>]*height="\d+"/);
});

test("margem lateral da faixa facts no celular = a do rodapé (16px)", opts, async () => {
  for (const w of [390, 360]) {
    const { ctx, page } = await abrir("/index.html", { w, h: 844, tema: "light" });
    const r = await page.evaluate(() => ({ facts: document.querySelector(".facts").getBoundingClientRect().x, rodape: parseFloat(getComputedStyle(document.querySelector(".nsft2 .ft-band-in")).paddingLeft), sw: [document.documentElement.scrollWidth, document.documentElement.clientWidth] }));
    assert.strictEqual(r.facts, 16, `${w}px: facts a ${r.facts}px da borda`);
    assert.strictEqual(r.rodape, 16);
    assert.ok(r.sw[0] <= r.sw[1], "sem overflow");
    await ctx.close();
  }
});

test("home: nenhum texto corrido em caixa alta (só rótulos curtos)", opts, async () => {
  for (const w of [1280, 390]) {
    const { ctx, page } = await abrir("/index.html", { w, h: 900, tema: "light" });
    const longos = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => getComputedStyle(e).textTransform === "uppercase" && !e.closest("[aria-hidden=true]") && e.getClientRects().length).map((e) => e.textContent.trim().replace(/\s+/g, " ")).filter((t) => t.split(" ").length > 4 || t.length > 28));
    assert.deepStrictEqual(longos, [], `${w}px: caixa alta em texto longo`);
    await ctx.close();
  }
});
