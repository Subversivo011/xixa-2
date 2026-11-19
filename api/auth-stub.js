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
const BANCOS_DE_PRODUCAO = ['naosalvo']; // o banco do ambiente de produção (o de dev é naosalvo_dev)

/** Devolve o autenticador do stub, ou null se AUTH_STUB não estiver ligado. Lança se ligado em produção. */
export function criarAutenticadorStub(env = process.env) {
  if (env.AUTH_STUB !== '1') return null;
  if (env.NODE_ENV === 'production' || BANCOS_DE_PRODUCAO.includes(env.DB_NAME || 'naosalvo')) {
    throw new Error('AUTH_STUB=1 é proibido em produção (banco/ambiente de produção detectado). Remova a variável.');
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
