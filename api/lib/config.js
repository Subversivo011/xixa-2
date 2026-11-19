// Configuração lida do ambiente. Sem dependências (testável sem banco).

/** Tamanho do pool do pg: DB_POOL_MAX (inteiro >= 1). Ausente ou inválido = 10. */
export function tamanhoDoPool(env = process.env) {
  const bruto = String(env.DB_POOL_MAX ?? '').trim();
  const n = /^\d+$/.test(bruto) ? Number(bruto) : 0;
  return n >= 1 ? Math.min(n, 100) : 10;
}
