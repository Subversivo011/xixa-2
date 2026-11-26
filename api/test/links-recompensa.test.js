// Teste de aprovação de links sugeridos e recompensa de link antigo (regras_economia).
// Valida: aprovar link pendente paga moedas e XP ao autor se identificável;
// aprovar de novo não paga (idempotência); recusar não paga; saldo e XP batem com razão;
// autor não cadastrado não impede aprovação nem quebra transação; auditoria gravada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { servidor, bancoDeTeste, semBanco } from './helpers.js';
import { criarAutenticadorStub } from '../auth-stub.js';

const skip = semBanco();
let db, s;

before(async () => {
  if (skip) return;
  db = await bancoDeTeste({ seed: true });
  s = await servidor(db.pool, {
    autenticar: criarAutenticadorStub({ AUTH_STUB: '1', DB_NAME: 'naosalvo_test_p' }),
    adminToken: 'segredo-admin'
  });
});

after(async () => {
  if (s) await s.fechar();
  if (db) await db.fechar();
});

const q = async (sql, val) => (await db.pool.query(sql, val)).rows;
const adminHeader = { Authorization: 'Bearer segredo-admin' };

async function criarUsuario(apelido) {
  const { rows: [u] } = await db.pool.query(
    'INSERT INTO usuarios (apelido, avatar_gato) VALUES ($1, $2) RETURNING id, apelido, xp, moedas',
    [apelido, JSON.stringify({ fur: 0, pat: 0, eye: 0, acc: 0, clo: 0, bg: 0 })]
  );
  return u;
}

test('POST /api/admin/links/:id: aprovar link pendente paga moedas e XP ao autor cadastrado', { skip }, async () => {
  const autor = await criarUsuario('autor_link_1');
  const memeId = 'havaianas-de-pau';

  const { rows: [link] } = await db.pool.query(
    "INSERT INTO links_sugeridos (meme_id, yt, autor, status) VALUES ($1, 'dQw4w9WgXcQ', $2, 'pendente') RETURNING id",
    [memeId, autor.apelido]
  );

  const regras = Object.fromEntries((await q('SELECT chave, valor FROM regras_economia')).map((x) => [x.chave, x.valor]));
  const xpEsperado = regras.xp_ganho?.link_antigo || 10;
  const moedasEsperadas = regras.recompensa_moedas?.link_antigo || 5;

  // Aprova o link
  const r = await s.post(`/api/admin/links/${link.id}`, { status: 'aprovado' }, { headers: adminHeader });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);

  // Confere status no banco
  const [linkAtualizado] = await q('SELECT status, revisado_em FROM links_sugeridos WHERE id = $1', [link.id]);
  assert.equal(linkAtualizado.status, 'aprovado');
  assert.ok(linkAtualizado.revisado_em);

  // Confere saldo e XP no cache de usuarios
  const [u] = await q('SELECT xp, moedas FROM usuarios WHERE id = $1', [autor.id]);
  assert.equal(Number(u.xp), xpEsperado);
  assert.equal(Number(u.moedas), moedasEsperadas);

  // Confere que razão bate com o cache
  const [razao] = await q(
    `SELECT COALESCE(sum(valor), 0)::int AS xr FROM eventos_xp WHERE usuario_id = $1 AND motivo = 'link_antigo' AND ref = $2`,
    [autor.id, 'link:' + link.id]
  );
  const [moedaRazao] = await q(
    `SELECT COALESCE(sum(valor), 0)::int AS mr FROM movimentos_moeda WHERE usuario_id = $1 AND motivo = 'link_antigo' AND ref = $2`,
    [autor.id, 'link:' + link.id]
  );
  assert.equal(razao.xr, xpEsperado);
  assert.equal(moedaRazao.mr, moedasEsperadas);

  // Confere log de auditoria
  const logs = await q("SELECT acao, alvo, detalhe FROM log_auditoria WHERE acao = 'link.aprovar' AND alvo = $1", ['links_sugeridos:' + link.id]);
  assert.ok(logs.length >= 1);
  assert.equal(logs[0].detalhe.status_anterior, 'pendente');
  assert.equal(logs[0].detalhe.autor_usuario_id, autor.id);

  // IDEMPOTÊNCIA: aprovar de novo não paga outra vez
  const r2 = await s.post(`/api/admin/links/${link.id}`, { status: 'aprovado' }, { headers: adminHeader });
  assert.equal(r2.status, 200);

  const [u2] = await q('SELECT xp, moedas FROM usuarios WHERE id = $1', [autor.id]);
  assert.equal(Number(u2.xp), xpEsperado);
  assert.equal(Number(u2.moedas), moedasEsperadas);

  const [qtdEventos] = await q("SELECT count(*)::int AS n FROM eventos_xp WHERE usuario_id = $1 AND ref = $2", [autor.id, 'link:' + link.id]);
  assert.equal(qtdEventos.n, 1);
});

test('POST /api/admin/links/:id: recusar link pendente NÃO paga moedas nem XP', { skip }, async () => {
  const autor = await criarUsuario('autor_link_recusado');
  const memeId = 'havaianas-de-pau';

  const { rows: [link] } = await db.pool.query(
    "INSERT INTO links_sugeridos (meme_id, yt, autor, status) VALUES ($1, 'abcdefghijk', $2, 'pendente') RETURNING id",
    [memeId, autor.apelido]
  );

  const r = await s.post(`/api/admin/links/${link.id}`, { status: 'recusado' }, { headers: adminHeader });
  assert.equal(r.status, 200);

  const [u] = await q('SELECT xp, moedas FROM usuarios WHERE id = $1', [autor.id]);
  assert.equal(Number(u.xp), 0);
  assert.equal(Number(u.moedas), 0);

  const [qtdEventos] = await q("SELECT count(*)::int AS n FROM eventos_xp WHERE usuario_id = $1 AND ref = $2", [autor.id, 'link:' + link.id]);
  assert.equal(qtdEventos.n, 0);

  const logs = await q("SELECT acao, detalhe FROM log_auditoria WHERE acao = 'link.recusar' AND alvo = $1", ['links_sugeridos:' + link.id]);
  assert.ok(logs.length >= 1);
  assert.equal(logs[0].detalhe.status_anterior, 'pendente');
});

test('POST /api/admin/links/:id: autor não cadastrado aprova normalmente sem quebrar', { skip }, async () => {
  const memeId = 'havaianas-de-pau';

  const { rows: [link] } = await db.pool.query(
    "INSERT INTO links_sugeridos (meme_id, yt, autor, status) VALUES ($1, '12345678901', 'visitante_sem_conta', 'pendente') RETURNING id",
    [memeId]
  );

  const r = await s.post(`/api/admin/links/${link.id}`, { status: 'aprovado' }, { headers: adminHeader });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);

  const [linkAtualizado] = await q('SELECT status FROM links_sugeridos WHERE id = $1', [link.id]);
  assert.equal(linkAtualizado.status, 'aprovado');
});
