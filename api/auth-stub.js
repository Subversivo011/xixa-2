// ============================================================================================
//  AUTENTICAÇÃO PROVISÓRIA (STUB) — SÓ PARA DESENVOLVIMENTO E TESTES. NUNCA EM PRODUÇÃO.
//
//  O login com Discord ainda não existe (docs/PLANO-IMPLEMENTACAO.md, seção 4.1). Até lá, as rotas que
//  exigem usuário (economia: /api/carteira, /api/album, /api/pacotes/*, /api/visita...) aceitam o header
//      X-Test-User: <apelido>
//  e criam o usuário na primeira vez. Só funciona com AUTH_STUB=1. Qualquer um que mande o header
//  vira esse usuário: por isso a API RECUSA SUBIR com o stub em produção.
//
//  Este é o ÚNICO ponto de entrada de identidade: o login Discord vai trocar `criarAutenticadorStub`
//  por um autenticador de sessão (cookie httpOnly) com a mesma assinatura (req, pool) => usuario | null.
//  As rotas não mudam.
// ============================================================================================

const APELIDO = /^[A-Za-z0-9_.\-]{3,20}$/;

/**
 * ALLOWLIST: o stub só liga se o NOME DO BANCO for de teste/dev E NODE_ENV não for "production".
 * Nome de teste/dev = token `test` ou `dev` delimitado por "_" ou pelo começo/fim do nome
 * (naosalvo_dev, naosalvo_test, test_db, dev_naosalvo, naosalvotest). Não vale substring solta:
 * "prod_devel" ou "naosalvo_devops" NÃO passam. NODE_ENV=test sozinho não basta (naosalvo + test = recusado).
 * Tudo o mais é recusado (naosalvo, naosalvo_staging, banco ausente...). Sem diferenciar maiúsculas.
 */
const BANCO_DE_TESTE_OU_DEV = /(^|_)(test|dev)(_|$)|(test|dev)$/;

export function stubPermitido(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  const banco = String(env.DB_NAME || '').trim().toLowerCase();
  if (nodeEnv === 'production') return false;
  return BANCO_DE_TESTE_OU_DEV.test(banco);
}

/** Devolve o autenticador do stub, ou null se AUTH_STUB não estiver ligado. Lança se ligado fora da allowlist. */
export function criarAutenticadorStub(env = process.env) {
  if (env.AUTH_STUB !== '1') return null;
  if (!stubPermitido(env)) {
    throw new Error(
      `AUTH_STUB=1 recusado: o stub só liga com DB_NAME de teste/dev (token test ou dev, ex.: naosalvo_dev) e NODE_ENV diferente de production ` +
      `(DB_NAME="${env.DB_NAME || ''}", NODE_ENV="${env.NODE_ENV || ''}"). Remova AUTH_STUB deste ambiente.`);
  }
  console.warn('!! AUTH_STUB=1: login de TESTE ativo (header X-Test-User). Não use fora de dev/teste.');

  return async function autenticarStub(req, pool) {
    const apelido = String(req.headers['x-test-user'] || '').trim();
    if (!APELIDO.test(apelido)) return null;
    const { rows } = await pool.query(
      `INSERT INTO usuarios (apelido, ultimo_acesso) VALUES ($1, now())
       ON CONFLICT (lower(apelido)) DO UPDATE SET ultimo_acesso = now()
       RETURNING id, apelido, banido`, [apelido]);
    return rows[0];
  };
}
