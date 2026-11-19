// Sorteio de pacotes: lógica pura (sem banco), reproduzível a partir de uma semente.
// Regras (docs/subversivo011/economia-e-escassez.md e album.html do protótipo):
//  - cada carta do pacote sorteia primeiro a raridade pelos pesos de `chances`, depois uma carta
//    da raridade com probabilidade igual entre elas (se a raridade não existir no escopo, sorteia em todo o escopo);
//  - `garantia`: se nenhuma carta sair com a raridade garantida ou melhor, a última é trocada por uma carta dessa faixa,
//    com peso chances[raridade] / (nº de cartas da raridade no escopo);
//  - o resultado vem ordenado da menor para a maior raridade (ordem estável).
import { createHash, randomBytes } from 'node:crypto';

export const RARIDADES = ['Comum', 'Relevante', 'Raro', 'Relíquia', 'Lendário', 'Mítico'];
const idx = (r) => RARIDADES.indexOf(r);

export const novaSemente = () => randomBytes(16).toString('hex');

/** Gerador determinístico em [0,1): sha256(semente:contador), 48 bits. */
export function criarRng(semente) {
  let i = 0;
  return () => createHash('sha256').update(`${semente}:${i++}`).digest().readUIntBE(0, 6) / 2 ** 48;
}

/**
 * @param cartas      [{ id, raridade }] do escopo do pacote, em ordem estável (a ordem faz parte da reprodução)
 * @param chances     { Comum: 44, ... } pesos por raridade
 * @param garantia    raridade mínima garantida ou null
 * @param quantidade  cartas por pacote
 * @param rng         () => [0,1)
 * @returns cartas sorteadas (objetos de `cartas`), da menor para a maior raridade
 */
export function sortearPacote({ cartas, chances, garantia = null, quantidade = 5, rng }) {
  if (!cartas.length) throw new Error('escopo sem cartas');
  const peso = (r) => Number(chances[r]) || 0;
  const total = RARIDADES.reduce((s, r) => s + peso(r), 0);
  if (!(total > 0)) throw new Error('chances inválidas');
  const porRaridade = Object.fromEntries(RARIDADES.map((r) => [r, cartas.filter((c) => c.raridade === r)]));

  const sortearUma = () => {
    let x = rng() * total, rar = RARIDADES[0];
    for (const r of RARIDADES) { if (x < peso(r)) { rar = r; break; } x -= peso(r); }
    const base = porRaridade[rar].length ? porRaridade[rar] : cartas;
    return base[Math.floor(rng() * base.length)];
  };

  const got = Array.from({ length: quantidade }, sortearUma);

  if (garantia && !got.some((c) => idx(c.raridade) >= idx(garantia))) {
    const faixa = cartas.filter((c) => idx(c.raridade) >= idx(garantia));
    if (faixa.length) {
      const w = faixa.map((c) => peso(c.raridade) / porRaridade[c.raridade].length);
      let t = w.reduce((a, b) => a + b, 0) * rng();
      got[quantidade - 1] = faixa.find((_, i) => (t -= w[i]) < 0) || faixa[0];
    }
  }
  return got.map((c, i) => [c, i]).sort((a, b) => idx(a[0].raridade) - idx(b[0].raridade) || a[1] - b[1]).map(([c]) => c);
}
