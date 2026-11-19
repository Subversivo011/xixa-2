// Abertura de pacote no álbum: nada do resultado aparece antes das cartas virarem
// (NOVA!, moedas/XP do cabeçalho, patente), e fechar/trocar o modal no meio do "Revelar tudo" não dá erro.
// Roda com arquivo explícito: node --test tests/album-pacote.test.js
// Precisa do Playwright (npm i playwright; npx playwright install chromium). Sem ele os testes são pulados.
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
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json" };
const servidor = () => new Promise((ok) => {
  const s = http.createServer((req, res) => {
    const arq = path.join(RAIZ, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TIPOS[path.extname(arq)] || "application/octet-stream" });
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

// página nova, estado zerado, com coletor de erros de console/página
async function abrir(extra) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push("console: " + m.text()); });
  await page.goto(base + "/album.html");
  await page.waitForFunction(() => document.getElementById("wallet")?.textContent.length > 0);
  if (extra) await extra(page);
  return { ctx, page, erros };
}
const carteira = (page) => page.evaluate(() => document.getElementById("wallet").textContent + "|" + document.getElementById("coins").textContent);
const rasgar = async (page) => {
  await page.evaluate(() => openFromInv(0));
  await page.click("#pkW");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("pkC")).display === "block");
};

test("rasgar o pacote não mostra NOVA! e o cabeçalho não muda até revelar", opts, async () => {
  const { ctx, page, erros } = await abrir();
  const antes = await carteira(page);
  await rasgar(page);
  const novas = await page.$$eval(".slot > .new", (els) => els.map((e) => getComputedStyle(e).visibility));
  assert.ok(novas.length > 0, "pacote de boas-vindas deveria ter cartas novas");
  assert.ok(novas.every((v) => v === "hidden"), "NOVA! visível antes de virar: " + novas);
  assert.strictEqual(await carteira(page), antes, "carteira mudou antes de revelar");
  await page.click(".flip"); // vira só uma
  assert.strictEqual(await carteira(page), antes, "carteira mudou com 1 carta virada");
  await page.click("#pkB"); // Revelar tudo
  await page.waitForFunction(() => getComputedStyle(document.getElementById("pkS")).visibility === "visible");
  assert.notStrictEqual(await carteira(page), antes, "carteira deveria atualizar depois de revelar tudo");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("fechar com Esc no meio da revelação atualiza a carteira", opts, async () => {
  const { ctx, page, erros } = await abrir();
  const antes = await carteira(page);
  await rasgar(page);
  assert.strictEqual(await carteira(page), antes);
  await page.keyboard.press("Escape");
  assert.notStrictEqual(await carteira(page), antes, "Esc deveria liberar a carteira");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("aviso de nova patente só depois de revelar", opts, async () => {
  const { ctx, page, erros } = await abrir(async (p) => {
    await p.evaluate(() => { NS.xp = nextRank(NS.xp).xp - 1; nsSave(); renderWallet(); });
  });
  await rasgar(page);
  await page.waitForTimeout(1000); // mais que os 600 ms do aviso antigo
  const visivel = () => page.evaluate(() => { const t = document.getElementById("toast"); return !!t && t.style.display !== "none" && /Nova patente/.test(t.textContent); });
  assert.strictEqual(await visivel(), false, "toast de patente apareceu antes de revelar");
  await page.click("#pkB");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("pkS")).visibility === "visible");
  await page.waitForFunction(() => /Nova patente/.test(document.getElementById("toast")?.textContent || ""), null, { timeout: 3000 });
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("fechar e abrir a loja durante o Revelar tudo não gera erro", opts, async () => {
  const { ctx, page, erros } = await abrir();
  await rasgar(page);
  await page.click("#pkB");          // agenda as viradas (260 ms entre cartas)
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.evaluate(() => openShop());
  await page.waitForTimeout(2500);   // deixa os timers antigos dispararem
  assert.ok(await page.evaluate(() => document.querySelector(".shop") !== null), "loja deveria estar aberta");
  assert.deepStrictEqual(erros, []);
  await ctx.close();
});

test("animação NOVA! é desligada com prefers-reduced-motion", opts, async () => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base + "/album.html");
  await page.waitForFunction(() => document.getElementById("wallet")?.textContent.length > 0);
  await rasgar(page);
  await page.click(".flip");
  const anim = await page.$eval(".slot.rev > .new", (e) => getComputedStyle(e).animationName).catch(() => "sem-nova");
  assert.ok(anim === "none" || anim === "sem-nova", "animationName=" + anim);
  await ctx.close();
});
