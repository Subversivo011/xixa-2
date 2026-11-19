// Configuração lida do ambiente. Sem dependências (testável sem banco).
import { readFileSync } from 'node:fs';

/** Tamanho do pool do pg: DB_POOL_MAX (inteiro >= 1). Ausente ou inválido = 10. */
export function tamanhoDoPool(env = process.env) {
  const bruto = String(env.DB_POOL_MAX ?? '').trim();
  const n = /^\d+$/.test(bruto) ? Number(bruto) : 0;
  return n >= 1 ? Math.min(n, 100) : 10;
}

/** Segredo vindo de arquivo (NOME_FILE, Docker secret) ou, em dev, da variável NOME. Nunca é logado. */
export const segredo = (nome, env = process.env) => {
  const arq = env[nome + '_FILE'];
  return arq ? readFileSync(arq, 'utf8').trim() : (env[nome] || '');
};
