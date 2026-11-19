// API do Não Salvo — Node puro + pg. Segredos via *_FILE (Docker secrets).
// Rotas por assunto em routes/, roteador em lib/router.js, montagem em app.js.
import { migrar, segredo, criarPoolDoAmbiente } from './migrate.js';
import { criarApp } from './app.js';
import { criarAutenticadorStub } from './auth-stub.js';

// falha ANTES de tocar no banco se o stub estiver ligado em produção (ver auth-stub.js)
const autenticar = criarAutenticadorStub();

const pool = criarPoolDoAmbiente();

// esquema do banco: migrações numeradas em api/migrations/ (executor em migrate.js)
await migrar(pool);

const { server } = criarApp({
  pool,
  adminToken: segredo('ADMIN_TOKEN'),
  ytKey: segredo('YT_API_KEY'), // opcional: sem chave, /api/yt-stats devolve {}
  autenticar // provisório até o login Discord: null (economia responde 401) salvo AUTH_STUB=1 em dev
});
server.listen(3000, () => console.log('naosalvo-api :3000'));
