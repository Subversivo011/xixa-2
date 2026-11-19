// Login com Discord (OAuth2, scope identify). Funções puras + chamadas HTTP injetáveis (fetch) para teste sem rede.
// Segredos só por arquivo (*_FILE); nada daqui é logado: nem client secret, nem code, nem access token.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { segredo } from '../lib/config.js';

const API = 'https://discord.com/api/v10';
export const AUTORIZAR = 'https://discord.com/oauth2/authorize';
const TIMEOUT_MS = 8000;

/**
 * Lê a configuração. Devolve null se faltar client id/secret/redirect (rotas respondem 503, o resto da API segue).
 *  DISCORD_CLIENT_ID_FILE, DISCORD_CLIENT_SECRET_FILE (obrigatórios), DISCORD_GUILD_ID_FILE (opcional),
 *  DISCORD_REDIRECT_URI (env), DISCORD_EXIGIR_MEMBRO=1 (opcional: só entra quem está no servidor do guild; pede o scope guilds).
 */
export function lerConfigDiscord(env = process.env) {
  const clientId = segredo('DISCORD_CLIENT_ID', env), clientSecret = segredo('DISCORD_CLIENT_SECRET', env);
  const redirectUri = String(env.DISCORD_REDIRECT_URI || '').trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  let u; try { u = new URL(redirectUri); } catch { return null; }
  if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return null; // https obrigatório fora de localhost
  const guildId = segredo('DISCORD_GUILD_ID', env) || null;
  return { clientId, clientSecret, redirectUri, guildId, exigirMembro: env.DISCORD_EXIGIR_MEMBRO === '1' && !!guildId };
}

// ---- redirect de volta: só caminhos relativos do próprio site ----
const CONTROLE = /[\u0000-\u0020\u007f-\u009f\u2028\u2029]/; // controle, espaço, CR/LF, NEL, separadores de linha

function decodificar(s) { try { return decodeURIComponent(s); } catch { return null; } }

/**
 * Devolve o MESMO valor se for um caminho relativo do próprio site; senão `padrao` ("/").
 * Nunca devolve uma versão "normalizada": o que não é inequívoco é recusado.
 * Recusa: o que não começa com um "/" só; "//" em qualquer ponto do caminho (inclusive depois de decodificar %2f);
 * segmentos "." e ".." (inclusive %2e); barra invertida (inclusive %5c); espaço, controle e CR/LF (inclusive %0d%0a);
 * esquema/host; valores > 300 caracteres. A decodificação é conferida em até 2 níveis (%252f).
 */
export function caminhoSeguro(valor, padrao = '/') {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 300) return padrao;
  if (!valor.startsWith('/') || valor.startsWith('//')) return padrao;
  const bruto = valor.split(/[?#]/, 1)[0]; // caminho sem query e hash
  let nivel = valor;
  let nivelCaminho = bruto;
  for (let n = 0; n < 3; n++) {  // bruto, decodificado 1x, decodificado 2x
    if (nivel.includes('\\') || CONTROLE.test(nivel)) return padrao;
    if (nivelCaminho.includes('//')) return padrao;
    if (nivelCaminho.split('/').some((seg) => seg === '.' || seg === '..')) return padrao;
    if (!nivelCaminho.startsWith('/')) return padrao;
    const proximo = decodificar(nivel), proximoCaminho = decodificar(nivelCaminho);
    if (proximo === null || proximoCaminho === null) return n === 0 ? padrao : valor; // %-inválido no 1º nível = recusa
    if (proximo === nivel) break;
    nivel = proximo; nivelCaminho = proximoCaminho;
  }
  try {
    const u = new URL(valor, 'https://site.invalid');
    if (u.origin !== 'https://site.invalid') return padrao;
    if (u.pathname !== bruto && u.pathname !== encodeURI(decodificar(bruto) ?? bruto)) return padrao; // o navegador reescreveria o caminho
  } catch { return padrao; }
  return valor;
}

/** Acrescenta ?chave=valor a um caminho já validado e REVALIDA o resultado; se não passar, cai em "/?chave=valor". */
export function comParametro(caminho, chave, valor) {
  const u = new URL(caminhoSeguro(caminho), 'https://site.invalid');
  u.searchParams.set(chave, valor);
  const montado = u.pathname + u.search + u.hash;
  return caminhoSeguro(montado, null) ?? `/?${new URLSearchParams({ [chave]: valor })}`;
}

// ---- state anti-CSRF (cookie ns_oauth = "<state>.<voltar em base64url>") ----
export const novoState = () => randomBytes(16).toString('base64url');
export const empacotarState = (state, voltar) => `${state}.${Buffer.from(voltar).toString('base64url')}`;
export function desempacotarState(valor) {
  const i = String(valor || '').indexOf('.');
  if (i < 1) return null;
  try { return { state: valor.slice(0, i), voltar: Buffer.from(valor.slice(i + 1), 'base64url').toString('utf8') }; } catch { return null; }
}
export function stateConfere(esperado, recebido) {
  const a = Buffer.from(String(esperado || '')), b = Buffer.from(String(recebido || ''));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function urlDeAutorizacao(cfg, state) {
  const p = new URLSearchParams({
    client_id: cfg.clientId, redirect_uri: cfg.redirectUri, response_type: 'code',
    scope: cfg.exigirMembro ? 'identify guilds' : 'identify', state
  });
  return `${AUTORIZAR}?${p}`;
}

// ---- chamadas ao Discord (fetchFn injetável) ----
export class ErroDiscord extends Error {}

async function chamar(fetchFn, url, opcoes, o) {
  let r;
  try { r = await fetchFn(url, { ...opcoes, signal: AbortSignal.timeout(TIMEOUT_MS) }); }
  catch (e) { throw new ErroDiscord(`${o}: sem resposta (${e.name})`); }
  if (!r.ok) throw new ErroDiscord(`${o}: HTTP ${r.status}`); // só o status; o corpo pode ter dados sensíveis
  try { return await r.json(); } catch { throw new ErroDiscord(`${o}: resposta inválida`); }
}

export async function trocarCodigo(cfg, code, fetchFn = fetch) {
  const j = await chamar(fetchFn, `${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64') },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: cfg.redirectUri })
  }, 'troca do código');
  if (typeof j.access_token !== 'string' || !j.access_token) throw new ErroDiscord('troca do código: sem access_token');
  return j.access_token;
}

export async function buscarPerfil(accessToken, fetchFn = fetch) {
  const j = await chamar(fetchFn, `${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } }, 'perfil');
  if (!/^\d{5,25}$/.test(String(j.id || ''))) throw new ErroDiscord('perfil: id inválido');
  return { id: String(j.id), username: String(j.username || ''), global_name: j.global_name ? String(j.global_name) : null };
}

export async function ehMembro(accessToken, guildId, fetchFn = fetch) {
  const lista = await chamar(fetchFn, `${API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${accessToken}` } }, 'servidores');
  return Array.isArray(lista) && lista.some((g) => String(g.id) === String(guildId));
}

// ---- usuário: apelido único e gato inicial ----
/** Apelido válido (3 a 20 de [A-Za-z0-9_.-]) derivado do nome do Discord; sufixo numérico quando já existe. */
export function gerarApelido(base, tentativa = 0) {
  let b = String(base || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^[_.-]+|[_.-]+$/g, '').replace(/_{2,}/g, '_');
  if (b.length < 3) b = (b + 'gato').slice(0, 8);
  if (tentativa === 0) return b.slice(0, 20);
  const sufixo = tentativa < 100 ? String(tentativa + 1) : String(Math.floor(1000 + Math.random() * 9000));
  return b.slice(0, 20 - sufixo.length) + sufixo;
}

/** Gato inicial: determinístico pelo id do Discord, mesmas faixas do criador de gato (common.js / álbum). */
export function gatoInicial(discordId) {
  const h = createHash('sha256').update('gato:' + discordId).digest();
  return { fur: h[0] % 10, pat: h[1] % 5, eye: h[2] % 5, acc: h[3] % 9, clo: h[4] % 7, bg: h[5] % 8 };
}

/** Acha ou cria o usuário do Discord. Devolve { id, apelido, banido, novo }. Não mexe em sessão. */
export async function acharOuCriarUsuario(pool, perfil) {
  const nomeExibicao = (perfil.global_name || perfil.username || '').slice(0, 64) || null;
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const { rows: ex } = await pool.query(
      `SELECT u.id, u.apelido, u.banido FROM contas_oauth c JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.provedor = 'discord' AND c.provedor_id = $1`, [perfil.id]);
    if (ex.length) {
      await pool.query("UPDATE contas_oauth SET nome_exibicao = $2 WHERE provedor = 'discord' AND provedor_id = $1", [perfil.id, nomeExibicao]);
      if (!ex[0].banido) await pool.query('UPDATE usuarios SET ultimo_acesso = now() WHERE id = $1', [ex[0].id]);
      return { id: Number(ex[0].id), apelido: ex[0].apelido, banido: ex[0].banido, novo: false };
    }
    const cli = await pool.connect();
    try {
      await cli.query('BEGIN');
      const { rows: [u] } = await cli.query(
        'INSERT INTO usuarios (apelido, avatar_gato, ultimo_acesso) VALUES ($1,$2,now()) RETURNING id, apelido',
        [gerarApelido(perfil.global_name || perfil.username, tentativa), JSON.stringify(gatoInicial(perfil.id))]);
      await cli.query(
        "INSERT INTO contas_oauth (usuario_id, provedor, provedor_id, nome_exibicao) VALUES ($1,'discord',$2,$3)", [u.id, perfil.id, nomeExibicao]);
      await cli.query('COMMIT');
      return { id: Number(u.id), apelido: u.apelido, banido: false, novo: true };
    } catch (e) {
      await cli.query('ROLLBACK').catch(() => {});
      if (e.code !== '23505') throw e; // apelido já existe (tenta outro) ou login simultâneo da mesma conta (relê no próximo laço)
    } finally { cli.release(); }
  }
  throw new Error('não foi possível gerar apelido único');
}
