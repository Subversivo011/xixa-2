# Runbook do banco (Fase 1)

Migrações em `api/migrations/`, executor em `api/migrate.js`, carga do acervo em `api/seed/acervo.js`.

## Ordem de subida (dev e, depois, prod)

1. **Backup antes de aplicar** (obrigatório, a 005 renomeia `votos`):
   `pg_dump -Fc -h <host> -U naosalvo <banco> > naosalvo_<banco>_$(date +%F).dump`
2. Suba a API. Na subida ela aplica sozinha as migrações pendentes (`schema_migrations`). Veja o log: `migração 00N_... aplicada`.
3. **Logo depois** rode o seed (a API sobe com tabelas de acervo vazias até lá):
   `DB_HOST=... DB_NAME=naosalvo_dev DB_USER=naosalvo DB_PASSWORD_FILE=<secret> node api/seed/acervo.js`
   (rode da raiz do repositório: ele lê `data.js`). Esperado: `68 memes, 109 cartas`.
4. Confira: `SELECT count(*) FROM memes;` (68) e `FROM cartas;` (109).

## Seed: só em dev, e uma vez

O seed faz upsert: **sobrescreve** título, descrição etc. dos memes que existem no `data.js` e **apaga e recria** as `midias` deles. Depois que o admin editar o acervo (Fase 3) ele desfaz edições. Em prod, rode uma única vez na carga inicial; não use como rotina. Regras de economia editadas no admin não são sobrescritas.

## Timeouts

O executor usa `lock_timeout = 5s` e `statement_timeout = 120s` por migração, e espera até 30s pela trava entre instâncias. Se falhar por timeout, nada daquela migração fica aplicado: tente de novo fora do pico. Ajustáveis por `MIGRATE_LOCK_TIMEOUT`, `MIGRATE_STATEMENT_TIMEOUT`, `MIGRATE_ADVISORY_TIMEOUT`.

## Deploy da stack

**Não** mude o `update_config` da API para `order: start-first`. Com start-first a versão nova migra enquanto a antiga ainda atende; a 005 renomeia `votos` e a versão antiga quebraria. Mantenha `stop-first`.

## Rollback manual (depois da 005)

Só vale se nada novo foi gravado na `votos` nova (ela nasce vazia). Restaure o código antigo **depois** do SQL. Se a `votos` nova já tiver dados, prefira restaurar o dump.

```sql
BEGIN;
DROP TABLE votos;                              -- a nova, vazia
ALTER TABLE votos_legado RENAME TO votos;
ALTER INDEX votos_legado_pkey RENAME TO votos_pkey;
DELETE FROM schema_migrations WHERE versao IN ('005', '006');
COMMIT;
```

Isso desfaz só o nome de `votos`. Como as colunas e tabelas da 005/006 continuam lá, reaplicar 005/006 depois falha ("already exists"): para reaplicar, restaure o dump ou apague antes esses objetos à mão. Colunas novas em `comentarios` e `feedback` (005) e as tabelas da 006 podem ficar: o código antigo as ignora. Para limpar de vez, restaure o dump do passo 1.

## Links sugeridos (007)

`links_sugeridos.meme_id` tem FK para `memes`: sem o seed rodado, `POST /api/links` responde 404 "meme não encontrado". Meme novo vindo de PR (ex.: entradas novas no `data.js`) só aceita sugestão depois de reexecutar o seed no ambiente.

## Antes da migração 008 em produção (conferir duplicatas)

A 008 cria índices **únicos** no razão. Se já existir linha repetida, a criação do índice falha e a migração inteira é desfeita (a API não sobe até corrigir). Rode antes, no banco alvo; o esperado é **0 linhas** nas duas consultas (hoje nenhum código grava nessas tabelas, então só deve haver linhas se alguém inseriu à mão):

```sql
SELECT usuario_id, motivo, ref, count(*) AS n
  FROM eventos_xp
 WHERE motivo IN ('visita_diaria', 'carta_nova', 'colecao_completa')
   AND ref IS NOT NULL
 GROUP BY usuario_id, motivo, ref
HAVING count(*) > 1;

SELECT usuario_id, motivo, ref, count(*) AS n
  FROM movimentos_moeda
 WHERE motivo = 'colecao_completa'
   AND ref IS NOT NULL
 GROUP BY usuario_id, motivo, ref
HAVING count(*) > 1;
```

Se aparecer alguma linha: faça o `pg_dump`, apague as repetidas deixando a de menor `id` de cada grupo e recalcule `usuarios.xp` e `usuarios.moedas` como soma do razão antes de subir. As consultas ignoram `ref` NULL de propósito: NULL é distinto no índice único, então essas linhas não impedem a 008.

## Limpeza de eventos_meme_ip (anti-spam do Sobe.Desce)

`eventos_meme_ip` guarda quem já contou visita/clique no dia (HMAC do IP, migração 009) e crescia sem limite; só o dia corrente importa. `api/lib/limpeza.js` apaga linhas com `dia < hoje - 2` (fuso America/Sao_Paulo; fica hoje + 2 dias de margem):

- Roda no boot da API (`server.js`) e depois a cada 6h (`setInterval(...).unref()`). Em cada réplica: o DELETE é idempotente, rodar duas vezes só custa uma consulta vazia.
- Em lotes de 5000 linhas (um DELETE por lote, transação curta, sem lock longo) até esgotar; teto de 2000 lotes por execução.
- Nunca derruba a API: erro vira log `limpeza de eventos_meme_ip falhou: ...`; sucesso com linhas apagadas loga `limpeza: N linhas antigas removidas`.
- Migração 011 cria `eventos_meme_ip_dia_idx (dia)` para achar as linhas antigas sem varrer a tabela (a PK começa por `meme_id`). No primeiro deploy a tabela pode ter muitas linhas acumuladas: o `CREATE INDEX` comum bloqueia INSERTs (`/api/eventos`) enquanto roda. Em produção, confira antes `SELECT count(*) FROM eventos_meme_ip`; se passar de alguns milhões, crie o índice antes à mão com `CREATE INDEX CONCURRENTLY eventos_meme_ip_dia_idx ON eventos_meme_ip (dia)` (a migração 011 usa `IF NOT EXISTS`, então segue sem erro).
- Manual: `DELETE FROM eventos_meme_ip WHERE dia < (now() AT TIME ZONE America/Sao_Paulo)::date - 2;`

O hash do IP (`api/lib/ip.js`, HMAC-SHA256 com o token de admin, 32 hex) é único para eventos, links e memepédia. **Não mude o algoritmo nem o token de admin sem avisar**: trocar o token invalida o anti-spam do dia (inofensivo, mas conta de novo).
