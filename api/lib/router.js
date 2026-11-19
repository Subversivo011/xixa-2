// Roteador mínimo: cada módulo em routes/ registra suas rotas; aqui só casa método + caminho.
// Caminho pode ser string exata ou RegExp (grupos de captura viram ctx.params).
// Rotas em /api/admin/ exigem o token de admin ANTES de casar (qualquer caminho sob /api/admin/ sem token = 401).
import { send, ehAdmin, ipDe } from './http.js';

export function criarRouter({ pool, adminToken = '', autenticar = null, extras = {} }) {
  const rotas = [];
  const add = (metodo, caminho, tratador, opcoes = {}) => rotas.push({ metodo, caminho, tratador, ...opcoes });
  const r = {
    get: (c, t, o) => add('GET', c, t, o),
    post: (c, t, o) => add('POST', c, t, o),
    delete: (c, t, o) => add('DELETE', c, t, o),
    rotas
  };

  r.tratar = async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const ip = ipDe(req);
    try {
      if (url.pathname.startsWith('/api/admin/') && !ehAdmin(req, adminToken)) {
        return send(res, 401, { error: 'Token inválido.' }, { 'WWW-Authenticate': 'Bearer' });
      }
      for (const rota of rotas) {
        if (rota.metodo !== req.method) continue;
        let params = [];
        if (typeof rota.caminho === 'string') { if (rota.caminho !== url.pathname) continue; }
        else { const m = rota.caminho.exec(url.pathname); if (!m) continue; params = m.slice(1); }
        const ctx = { req, res, url, ip, params, pool, adminToken, ...extras };
        if (rota.autenticada) {
          // login ainda não existe: autenticar() vem do auth-stub (só em dev/teste). Ver api/auth-stub.js
          const usuario = autenticar ? await autenticar(req, pool) : null;
          if (!usuario) return send(res, 401, { erro: 'login necessário' });
          if (usuario.banido) return send(res, 403, { erro: 'conta suspensa' });
          ctx.usuario = usuario;
        }
        return await rota.tratador(ctx);
      }
      return send(res, 404, { error: 'Não encontrado.' });
    } catch (e) {
      console.error(new Date().toISOString(), e.message);
      return send(res, 500, { error: 'Erro interno.' });
    }
  };
  return r;
}
