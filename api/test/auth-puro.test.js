// Login com Discord, partes que não precisam de banco (rodam no CI): open redirect, state, cookies, CSRF,
// config por arquivo, apelido, gato inicial e o começo/fim do fluxo OAuth com pool falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  caminhoSeguro, comParametro, empacotarState, desempacotarState, stateConfere, novoState, urlDeAutorizacao,
  gerarApelido, gatoInicial, lerConfigDiscord
} from '../auth/discord.js';
import { hashToken, csrfDe, novoToken } from '../auth/sessao.js';
import { lerCookies, montarCookie, apagarCookie } from '../lib/cookies.js';
import { verificarCsrf } from '../lib/csrf.js';
import { servidor } from './helpers.js';

const CFG = { clientId: '111', clientSecret: 'segredo-do-app', redirectUri: 'https://naosalvo-dev.fishlab.com.br/api/auth/discord/callback', guildId: null, exigirMembro: false };
const poolFalso = { query: async () => { throw new Error('não deveria tocar no banco'); } };

test('open redirect: só caminhos relativos do próprio site passam', () => {
  for (const ok of ['/', '/album.html', '/album.html?x=1#topo', '/memes/2008', '/a/b/c?d=e']) assert.equal(caminhoSeguro(ok), ok, ok);
  const ruins = ['https://evil.com', 'http://evil.com/x', '//evil.com', '///evil.com', '/\\evil.com', '\\\\evil.com', '/\\/evil.com',
    'javascript:alert(1)', 'data:text/html,x', 'evil.com', 'album.html', '', ' /album', '/a b', '/a\nb', '/a\r\nLocation: x', '/\tevil', 'HTTPS://evil.com',
    '/' + 'a'.repeat(400), null, undefined, 42, {}];
  for (const r of ruins) assert.equal(caminhoSeguro(r), '/', JSON.stringify(r));
  assert.equal(caminhoSeguro('//evil.com', '/inicio'), '/inicio');
});

test('comParametro preserva query e hash', () => {
  assert.equal(comParametro('/album.html', 'login', 'banido'), '/album.html?login=banido');
  assert.equal(comParametro('/a?x=1#t', 'login', 'erro'), '/a?x=1&login=erro#t');
  assert.equal(comParametro('/a?login=velho', 'login', 'negado'), '/a?login=negado');
});

test('state: empacota/desempacota, confere em tempo constante e recusa diferente/vazio', () => {
  const s = novoState();
  assert.ok(s.length >= 20); assert.notEqual(s, novoState());
  const v = empacotarState(s, '/album.html?a=1');
  assert.deepEqual(desempacotarState(v), { state: s, voltar: '/album.html?a=1' });
  assert.equal(desempacotarState('sem-ponto'), null); assert.equal(desempacotarState(''), null); assert.equal(desempacotarState(undefined), null);
  assert.ok(stateConfere(s, s));
  assert.ok(!stateConfere(s, s + 'x')); assert.ok(!stateConfere(s, 'outro')); assert.ok(!stateConfere('', '')); assert.ok(!stateConfere(s, null));
});

test('URL de autorização: scope identify, state e redirect_uri; guilds só quando exige membro', () => {
  const u = new URL(urlDeAutorizacao(CFG, 'ST'));
  assert.equal(u.origin + u.pathname, 'https://discord.com/oauth2/authorize');
  assert.equal(u.searchParams.get('scope'), 'identify'); assert.equal(u.searchParams.get('state'), 'ST');
  assert.equal(u.searchParams.get('client_id'), '111'); assert.equal(u.searchParams.get('redirect_uri'), CFG.redirectUri);
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.ok(!u.search.includes('segredo-do-app'));
  assert.equal(new URL(urlDeAutorizacao({ ...CFG, guildId: '9', exigirMembro: true }, 'S')).searchParams.get('scope'), 'identify guilds');
});

test('cookies: HttpOnly, SameSite=Lax e Secure por padrão; apagar zera o Max-Age', () => {
  const c = montarCookie('ns_sessao', 'abc', { maxAge: 100 });
  assert.match(c, /HttpOnly/); assert.match(c, /SameSite=Lax/); assert.match(c, /; Secure/); assert.match(c, /Path=\//); assert.match(c, /Max-Age=100/);
  assert.ok(!/; Secure/.test(montarCookie('x', 'y', { secure: false })));
  assert.match(apagarCookie('ns_sessao'), /Max-Age=0/);
  assert.deepEqual(lerCookies('a=1; ns_sessao=tok%20en; b=3; a=2'), { a: '1', ns_sessao: 'tok en', b: '3' });
  assert.deepEqual(lerCookies(undefined), {});
});

test('sessão: hash sha256 do token, CSRF derivado e diferente do token e do hash', () => {
  const t = novoToken();
  assert.ok(t.length >= 40); assert.notEqual(t, novoToken());
  assert.equal(hashToken(t), createHash('sha256').update(t).digest('hex'));
  assert.notEqual(hashToken(t), t);
  assert.equal(csrfDe(t), csrfDe(t)); assert.notEqual(csrfDe(t), csrfDe(novoToken()));
  assert.notEqual(csrfDe(t), t); assert.notEqual(csrfDe(t), hashToken(t));
});

test('CSRF: exige X-CSRF da sessão e, se houver Origin, que seja o do site', () => {
  const t = csrfDe('token'), site = 'https://naosalvo.example';
  const req = (headers) => ({ headers });
  assert.equal(verificarCsrf(req({ 'x-csrf': t }), t, site), null);
  assert.equal(verificarCsrf(req({ 'x-csrf': t, origin: site }), t, site), null);
  assert.match(verificarCsrf(req({}), t, site), /CSRF/);
  assert.match(verificarCsrf(req({ 'x-csrf': 'errado' }), t, site), /CSRF/);
  assert.match(verificarCsrf(req({ 'x-csrf': t, origin: 'https://evil.com' }), t, site), /origem/);
  assert.match(verificarCsrf(req({ 'x-csrf': t, origin: 'null' }), t, site), /origem/);
  assert.match(verificarCsrf(req({ 'x-csrf': '' }), '', site), /CSRF/); // esperado vazio nunca autoriza
});

test('apelido: derivado do nome, válido (3 a 20), sufixo numérico para colisão', () => {
  assert.equal(gerarApelido('Zé Fulano'), 'Ze_Fulano');
  assert.equal(gerarApelido('  João!!  '), 'Joao');
  assert.equal(gerarApelido('a'), 'agato'); assert.equal(gerarApelido('😀😀'), 'gato');
  assert.equal(gerarApelido('x'.repeat(40)).length, 20);
  assert.equal(gerarApelido('Fulano', 0), 'Fulano'); assert.equal(gerarApelido('Fulano', 1), 'Fulano2'); assert.equal(gerarApelido('Fulano', 2), 'Fulano3');
  assert.ok(gerarApelido('x'.repeat(40), 5).length <= 20);
  for (const n of ['Zé', '日本語', 'a.b-c_d', '!!!', 'A'.repeat(30)]) for (let i = 0; i < 4; i++) assert.match(gerarApelido(n, i), /^[A-Za-z0-9_.\-]{3,20}$/, n);
});

test('gato inicial: determinístico e dentro das faixas do criador de gato', () => {
  const g = gatoInicial('123456789012345678');
  assert.deepEqual(g, gatoInicial('123456789012345678'));
  assert.ok(g.fur < 10 && g.pat < 5 && g.eye < 5 && g.acc < 9 && g.clo < 7 && g.bg < 8);
  assert.notDeepEqual(gatoInicial('1'.repeat(18)), gatoInicial('2'.repeat(18)));
});

test('config do Discord: segredos só por arquivo, redirect por env, https obrigatório, incompleto = null', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ns-discord-'));
  const f = (nome, v) => { const p = join(dir, nome); writeFileSync(p, v + '\n'); return p; };
  const env = {
    DISCORD_CLIENT_ID_FILE: f('id', '111'), DISCORD_CLIENT_SECRET_FILE: f('secret', 'xyz'), DISCORD_GUILD_ID_FILE: f('guild', '999'),
    DISCORD_REDIRECT_URI: CFG.redirectUri
  };
  assert.deepEqual(lerConfigDiscord(env), { clientId: '111', clientSecret: 'xyz', redirectUri: CFG.redirectUri, guildId: '999', exigirMembro: false });
  assert.equal(lerConfigDiscord({ ...env, DISCORD_EXIGIR_MEMBRO: '1' }).exigirMembro, true);
  const semGuild = { ...env }; delete semGuild.DISCORD_GUILD_ID_FILE;
  assert.equal(lerConfigDiscord(semGuild).guildId, null);
  assert.equal(lerConfigDiscord({ ...semGuild, DISCORD_EXIGIR_MEMBRO: '1' }).exigirMembro, false); // sem guild não há como exigir
  assert.equal(lerConfigDiscord({}), null);
  assert.equal(lerConfigDiscord({ ...env, DISCORD_REDIRECT_URI: '' }), null);
  assert.equal(lerConfigDiscord({ ...env, DISCORD_REDIRECT_URI: 'http://naosalvo.example/cb' }), null); // http fora de localhost
  assert.ok(lerConfigDiscord({ ...env, DISCORD_REDIRECT_URI: 'http://localhost:3000/cb' }));
  assert.throws(() => lerConfigDiscord({ ...env, DISCORD_CLIENT_SECRET_FILE: join(dir, 'nao-existe') }), /ENOENT/); // arquivo configurado e ausente = falha na subida
});

// ---- rotas com pool falso (nenhuma toca no banco) ----
const lerCookie = (cookies, nome) => cookies.find((c) => c.startsWith(nome + '='));

test('GET /api/auth/discord: 302 para o Discord com state, e o MESMO state no cookie httpOnly', async () => {
  const s = await servidor(poolFalso, { auth: { discord: CFG } });
  const r = await s.get('/api/auth/discord?voltar=/album.html', { headers: { 'X-Forwarded-For': '10.9.0.1' } });
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get('location'));
  assert.equal(loc.origin, 'https://discord.com'); assert.equal(loc.searchParams.get('scope'), 'identify');
  const ck = lerCookie(r.cookies, 'ns_oauth');
  assert.match(ck, /HttpOnly/); assert.match(ck, /SameSite=Lax/); assert.match(ck, /Secure/); assert.match(ck, /Path=\/api\/auth/);
  const guardado = desempacotarState(decodeURIComponent(ck.split(';')[0].split('=')[1]));
  assert.equal(guardado.state, loc.searchParams.get('state')); assert.equal(guardado.voltar, '/album.html');
  await s.fechar();
});

test('GET /api/auth/discord: voltar externo vira "/" (open redirect) e nunca vai ao Discord', async () => {
  const s = await servidor(poolFalso, { auth: { discord: CFG } });
  for (const v of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)']) {
    const r = await s.get('/api/auth/discord?voltar=' + encodeURIComponent(v), { headers: { 'X-Forwarded-For': '10.9.0.2' } });
    const ck = lerCookie(r.cookies, 'ns_oauth');
    assert.equal(desempacotarState(decodeURIComponent(ck.split(';')[0].split('=')[1])).voltar, '/', v);
    assert.ok(!r.headers.get('location').includes('evil'));
  }
  await s.fechar();
});

test('callback: state ausente, divergente ou sem cookie = 400, sem tocar no banco nem chamar o Discord', async () => {
  let chamadas = 0;
  const s = await servidor(poolFalso, { auth: { discord: CFG, fetch: async () => { chamadas++; throw new Error('sem rede'); } } });
  const h = (ip, extra = {}) => ({ headers: { 'X-Forwarded-For': ip, ...extra } });
  const cookieDoState = encodeURIComponent(empacotarState('estado-certo', '/'));
  assert.equal((await s.get('/api/auth/discord/callback?code=c&state=x', h('10.9.1.1'))).status, 400);                                  // sem cookie
  assert.equal((await s.get('/api/auth/discord/callback?code=c', h('10.9.1.2', { Cookie: 'ns_oauth=' + cookieDoState }))).status, 400); // sem state
  const r = await s.get('/api/auth/discord/callback?code=c&state=outro', h('10.9.1.3', { Cookie: 'ns_oauth=' + cookieDoState }));
  assert.equal(r.status, 400); assert.match(r.json.erro, /estado de login inválido/);
  assert.ok(lerCookie(r.cookies, 'ns_oauth')?.includes('Max-Age=0'), 'state descartado');
  assert.ok(!r.cookies.some((c) => c.startsWith('ns_sessao=')), 'nenhuma sessão aberta');
  assert.equal(chamadas, 0);
  await s.fechar();
});

test('callback: usuário cancelou no Discord = volta para a página com ?login=negado', async () => {
  const s = await servidor(poolFalso, { auth: { discord: CFG } });
  const ck = encodeURIComponent(empacotarState('ok-state', '/album.html'));
  const r = await s.get('/api/auth/discord/callback?error=access_denied&state=ok-state', { headers: { 'X-Forwarded-For': '10.9.2.1', Cookie: 'ns_oauth=' + ck } });
  assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/album.html?login=negado');
  await s.fechar();
});

test('callback: cookie adulterado com destino externo é revalidado (volta para "/")', async () => {
  const s = await servidor(poolFalso, { auth: { discord: CFG } });
  const ck = encodeURIComponent(empacotarState('st', 'https://evil.com/phish'));
  const r = await s.get('/api/auth/discord/callback?error=access_denied&state=st', { headers: { 'X-Forwarded-For': '10.9.2.2', Cookie: 'ns_oauth=' + ck } });
  assert.equal(r.headers.get('location'), '/?login=negado');
  await s.fechar();
});

test('sem configuração do Discord: 503 nas rotas de login e o resto da API segue', async () => {
  const s = await servidor({ query: async () => ({ rows: [] }) }, { auth: { discord: null } });
  assert.equal((await s.get('/api/auth/discord', { headers: { 'X-Forwarded-For': '10.9.3.1' } })).status, 503);
  assert.equal((await s.get('/api/auth/discord/callback?code=1&state=2', { headers: { 'X-Forwarded-For': '10.9.3.2' } })).status, 503);
  assert.equal((await s.get('/api/health')).status, 200);
  await s.fechar();
});

test('rotas de login têm rate limit por IP (429 depois de 30)', async () => {
  const s = await servidor(poolFalso, { auth: { discord: CFG } });
  const h = { headers: { 'X-Forwarded-For': '10.9.4.4' } };
  let ultimo;
  for (let i = 0; i < 31; i++) ultimo = await s.get('/api/auth/discord', h);
  assert.equal(ultimo.status, 429);
  assert.equal((await s.get('/api/auth/discord', { headers: { 'X-Forwarded-For': '10.9.4.5' } })).status, 302); // outro IP não é afetado
  await s.fechar();
});

test('/api/eu e rotas protegidas sem login: 401', async () => {
  const s = await servidor(poolFalso, { autenticar: async () => null });
  assert.equal((await s.get('/api/eu')).status, 401);
  assert.equal((await s.post('/api/pacotes/abrir', {})).status, 401);
  await s.fechar();
});
