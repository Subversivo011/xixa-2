# API

Node puro + Postgres (`api/`). Rotas por assunto em `api/routes/`, roteador em `api/lib/router.js`, montagem em `api/app.js`. Respostas em JSON; erros em `{ erro }` (rotas novas e comunidade) ou `{ error }` (formulário de contribuidores e admin, formato antigo mantido).

## Saúde

| Rota | Resposta |
|---|---|
| `GET /api/health` | `200 { ok: true, banco: "ok" }`; `503 { ok: false, banco: "falha" }` se o banco não responder em 2 s |

## Acervo (público, cache de 60 s)

Só memes com `status = 'publicado'`. Fonte da verdade: Postgres (carga inicial em `api/seed/acervo.js`).

| Rota | Descrição |
|---|---|
| `GET /api/memes` | `{ total, itens[] }`. Filtros: `ano`, `categoria`, `raridade`, `limite` (máx. 500), `offset`. Ordem: ano, data, id |
| `GET /api/memes/:id` | Um meme (`400` id inválido, `404` inexistente ou não publicado) |
| `GET /api/eras` | `{ itens[] }` com `ano`, `ano_fim` (`null` na era aberta "2020+"), `rotulo`, `lema`, `texto` |
| `GET /api/categorias` | `{ itens[] }` com `nome`, `icone`, `emoji`, `total` de memes publicados |

Cada meme: `id, titulo, ano, data, categoria, tipo, raridade, emoji, descricao, autor, duracao, youtube_id, adicionado_em, midias[]`; cada mídia: `tipo` (`imagem` ou `video_arquivo`), `caminho`, `origem_url`, `credito_por`, `credito_url`, `largura`, `altura`.

## Rotas já existentes (comportamento inalterado)

`/api/contribuidores`, `/api/votos` (agregado anônimo, tabela `votos_legado`), `/api/feedback`, `/api/comentarios`, `/api/links`, `/api/links/aprovados`, `/api/yt-stats` e `/api/admin/*` (token `Bearer`). Limites de uso por IP seguem em memória.

## Testes

`cd api && npm test` roda `node --test`. Testes que precisam de Postgres só rodam com um banco **descartável** (`TEST_DB_NAME` precisa conter `test` ou `descart`; cada arquivo usa um schema próprio):

```
docker run -d --name pgtest -e POSTGRES_USER=naosalvo -e POSTGRES_PASSWORD=t -e POSTGRES_DB=naosalvo_test -p 54329:5432 postgres:16-alpine
TEST_DB_PORT=54329 TEST_DB_PASSWORD=t TEST_DB_NAME=naosalvo_test npm test
```

Sem `TEST_DB_NAME` esses testes são pulados (é o caso do CI, que não tem Postgres).
