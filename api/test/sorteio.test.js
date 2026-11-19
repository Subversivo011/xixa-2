// Sorteio de pacotes: lógica pura, roda sem banco (também no CI).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RARIDADES, criarRng, sortearPacote } from '../economia/sorteio.js';

// mesma composição do álbum: 28 Comum, 26 Relevante, 21 Raro, 15 Relíquia, 11 Lendário, 8 Mítico
const COMPOSICAO = { Comum: 28, Relevante: 26, Raro: 21, 'Relíquia': 15, 'Lendário': 11, 'Mítico': 8 };
const CARTAS = Object.entries(COMPOSICAO).flatMap(([raridade, n]) => Array.from({ length: n }, (_, i) => ({ id: `${raridade}-${i}`, raridade })));
const ODDS = { Comum: 44, Relevante: 26, Raro: 15, 'Relíquia': 9, 'Lendário': 5, 'Mítico': 1 };
const OURO = { Comum: 0, Relevante: 30, Raro: 38, 'Relíquia': 19, 'Lendário': 10, 'Mítico': 3 };
const idx = (r) => RARIDADES.indexOf(r);

test('distribuição por raridade bate com as chances (200 mil cartas)', () => {
  const rng = criarRng('distribuicao');
  const cont = Object.fromEntries(RARIDADES.map((r) => [r, 0]));
  const PACOTES = 40_000;
  for (let i = 0; i < PACOTES; i++) for (const c of sortearPacote({ cartas: CARTAS, chances: ODDS, quantidade: 5, rng })) cont[c.raridade]++;
  const total = PACOTES * 5;
  for (const r of RARIDADES) {
    const obs = (cont[r] / total) * 100;
    assert.ok(Math.abs(obs - ODDS[r]) < 0.5, `${r}: observado ${obs.toFixed(2)}% esperado ${ODDS[r]}%`);
  }
});

test('dentro da raridade todas as cartas têm a mesma chance', () => {
  const rng = criarRng('uniforme');
  const cont = {};
  for (let i = 0; i < 40_000; i++) for (const c of sortearPacote({ cartas: CARTAS, chances: ODDS, quantidade: 5, rng })) cont[c.id] = (cont[c.id] || 0) + 1;
  const esperado = (200_000 * ODDS.Comum / 100) / COMPOSICAO.Comum; // ~3143 por carta Comum
  for (let i = 0; i < COMPOSICAO.Comum; i++) {
    const n = cont[`Comum-${i}`] || 0;
    assert.ok(Math.abs(n - esperado) / esperado < 0.1, `Comum-${i}: ${n} vs ${esperado.toFixed(0)}`);
  }
});

test('garantia: todo pacote vem com a raridade mínima; sem garantia nem sempre', () => {
  const rng = criarRng('garantia');
  let semGarantiaSemRaro = 0;
  for (let i = 0; i < 20_000; i++) {
    const g = sortearPacote({ cartas: CARTAS, chances: ODDS, garantia: 'Raro', quantidade: 5, rng });
    assert.ok(g.some((c) => idx(c.raridade) >= idx('Raro')), 'faltou Raro ou melhor');
    const s = sortearPacote({ cartas: CARTAS, chances: ODDS, quantidade: 5, rng });
    if (!s.some((c) => idx(c.raridade) >= idx('Raro'))) semGarantiaSemRaro++;
  }
  // (0,44+0,26)^5 ≈ 16,8% dos pacotes sem garantia não têm Raro: a garantia está mesmo agindo
  assert.ok(semGarantiaSemRaro > 20_000 * 0.14 && semGarantiaSemRaro < 20_000 * 0.2, String(semGarantiaSemRaro));
});

test('pacote Ouro: nunca Comum e sempre Relíquia ou melhor', () => {
  const rng = criarRng('ouro');
  for (let i = 0; i < 20_000; i++) {
    const p = sortearPacote({ cartas: CARTAS, chances: OURO, garantia: 'Relíquia', quantidade: 5, rng });
    assert.ok(p.every((c) => c.raridade !== 'Comum'));
    assert.ok(p.some((c) => idx(c.raridade) >= idx('Relíquia')));
  }
});

test('mesma semente = mesmo pacote (auditável); semente diferente muda; saída ordenada por raridade', () => {
  const a = sortearPacote({ cartas: CARTAS, chances: ODDS, garantia: 'Raro', quantidade: 5, rng: criarRng('abc') }).map((c) => c.id);
  const b = sortearPacote({ cartas: CARTAS, chances: ODDS, garantia: 'Raro', quantidade: 5, rng: criarRng('abc') }).map((c) => c.id);
  assert.deepEqual(a, b);
  const outros = new Set(Array.from({ length: 20 }, (_, i) => sortearPacote({ cartas: CARTAS, chances: ODDS, quantidade: 5, rng: criarRng('s' + i) }).map((c) => c.id).join()));
  assert.ok(outros.size > 15);
  const ranks = a.map((id) => idx(CARTAS.find((c) => c.id === id).raridade));
  assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y));
});

test('escopo sem alguma raridade: sorteia dentro do escopo (pacote da coleção)', () => {
  const colecao = CARTAS.filter((c) => ['Comum', 'Raro'].includes(c.raridade)).slice(0, 12);
  const rng = criarRng('escopo');
  for (let i = 0; i < 2000; i++) {
    const p = sortearPacote({ cartas: colecao, chances: ODDS, quantidade: 5, rng });
    assert.equal(p.length, 5);
    assert.ok(p.every((c) => colecao.includes(c)));
  }
});

test('entradas inválidas', () => {
  assert.throws(() => sortearPacote({ cartas: [], chances: ODDS, rng: criarRng('x') }), /escopo sem cartas/);
  assert.throws(() => sortearPacote({ cartas: CARTAS, chances: { Comum: 0 }, rng: criarRng('x') }), /chances inválidas/);
});
