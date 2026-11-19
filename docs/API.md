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

## Economia (servidor é a autoridade)

Moedas, XP e cartas só mudam por chamadas da API, dentro de uma transação que trava a linha do usuário. Saldo e XP são a **soma do razão** (`movimentos_moeda`, `eventos_xp`); `usuarios.moedas` e `usuarios.xp` são cache atualizado na mesma transação. Valores de recompensa e de repetidas vêm de `regras_economia`; preço, chances e garantia de cada pacote vêm de `pacotes_tipo`. Regras de negócio: `docs/subversivo011/economia-e-escassez.md`.

Sem o acervo carregado (seed não rodou) ou sem as regras de economia, `abrir` e a carteira respondem `503 { erro: "serviço indisponível, tente mais tarde" }`; o detalhe (o que falta e o que rodar) vai só para o log do servidor. Nada é gravado.

Rotas marcadas com 🔒 exigem usuário (ver **Autenticação provisória**). Erros de regra: `{ erro }` com 400, 402 (moedas insuficientes), 404 ou 409. Até 60 ações de escrita por usuário a cada 10 min (429).

| Rota | Descrição |
|---|---|
| 🔒 `GET /api/carteira` | `moedas`, `xp` (do razão), `patente` e `proxima_patente`, `pacotes` no estoque, resumo das `cartas` e `valor_das_repetidas` |
| 🔒 `GET /api/album` | Coleções com todas as cartas e a `quantidade` que o usuário tem; `tenho`, `total`, `completa` |
| 🔒 `POST /api/visita` | Visita do dia (fuso de `regras_economia.limites`): +XP, pacote diário (acumula até 7) e, **na primeira visita da conta** (ainda não existe cadastro), o pacote de boas-vindas. Idempotente por dia |
| 🔒 `POST /api/pacotes/comprar` | `{ tipo, colecao_id? }` (`colecao_id` só no pacote da coleção). Cobra no razão e guarda no estoque. `402` sem moedas; pacote grátis não se compra |
| 🔒 `POST /api/pacotes/abrir` | `{ estoque_id }` ou `{ tipo, colecao_id? }` (abre o mais antigo). Sorteia no servidor, grava em `pacotes_abertos` (com a `semente`, que reproduz o sorteio) e credita cartas, XP e o bônus de coleção completa numa só transação. Devolve `cartas[]` (com `nova`), `xp_ganho`, `moedas_ganhas`, `colecoes_completas`, `carteira` |
| 🔒 `POST /api/album/reciclar` | `{ carta_id }` ou `{ todas: true }`. **É o único jeito de uma repetida virar moeda**: abrir pacote só soma a carta ao inventário (`quantidade`) e informa `valor_das_repetidas`, sem pagar. Converte repetidas em moedas (sempre fica 1 de cada). `409` se não houver repetida |
| `GET /api/ranking?metrica=xp\|cartas&limite=50` | Público. `xp` soma os eventos do razão; `cartas` conta cartas distintas. Banidos ficam de fora |

Idempotência do razão: visita do dia, carta nova e coleção completa têm índice único por usuário e referência, então retry ou corrida nunca pagam duas vezes.

## Autenticação provisória (stub)

O login com Discord ainda não existe. Até lá, `api/auth-stub.js` é o **único** ponto de identidade: com `AUTH_STUB=1`, o header `X-Test-User: <apelido>` (3 a 20 letras, números, `_`, `.`, `-`) identifica o usuário e o cria na primeira chamada. Sem a variável, as rotas 🔒 respondem `401`.

- **Só dev e teste.** Quem manda o header vira aquele usuário. A guarda é uma **allowlist**: o stub só liga se `DB_NAME` é de teste/dev **por token** (`naosalvo_dev`, `naosalvo_test`, `test_x`, `dev_x` ou nome terminando em `test`/`dev`; `prod_devel` não vale) **e** `NODE_ENV` não é `production` (sem diferenciar maiúsculas). `NODE_ENV=test` sozinho não basta. Qualquer outro caso (`naosalvo`, `naosalvo_staging`, banco ausente, `NODE_ENV=Production`, `naosalvo` com `NODE_ENV=test`) faz a API **recusar subir**, com erro claro, antes de tocar no banco. Nunca coloque `AUTH_STUB` em `docker-stack.yml`.
- O login Discord troca só o autenticador (`(req, pool) => usuario | null`, sessão em cookie `httpOnly`); as rotas e os testes de economia seguem iguais.

## Decisões de produto

### Fechadas

1. **Repetida fica no inventário e só vira moeda via `POST /api/album/reciclar`.** Abrir pacote soma a carta em `inventario_cartas.quantidade` e informa `valor_das_repetidas`, sem pagar. Assim a repetida continua existindo como carta, o que deixa espaço para **troca de figurinhas** no futuro. Consequência: `docs/subversivo011/economia-e-escassez.md` ("toda repetida vira moeda na hora") está **desatualizado** nesse ponto; a nota foi registrada no topo daquele arquivo. Os números da simulação valem como referência de ritmo, não como descrição exata.

### Em aberto (implementado como no protótipo; confirmar com o grupo antes de divulgar)

1. **Boas-vindas na primeira visita**, não "no cadastro" como diz o documento de economia, porque ainda não há cadastro. Com o login Discord passa a ser no primeiro login.
2. **Preço do pacote Clássico (150 moedas)**: número da simulação, ainda não validado pelo grupo. Fica em `pacotes_tipo.preco`.
3. **Pacote diário acumula até 7** e o "dia" segue `America/Sao_Paulo` (`regras_economia.limites`).
4. **Sem tiragem numerada nos Míticos** (é recomendação do documento de economia, não implementada).

## Configuração

`DB_POOL_MAX` define o tamanho do pool de conexões do pg (inteiro de 1 a 100; padrão 10).

## Rotas já existentes (comportamento inalterado)

`/api/contribuidores`, `/api/votos` (agregado anônimo, tabela `votos_legado`), `/api/feedback`, `/api/comentarios`, `/api/links`, `/api/links/aprovados`, `/api/yt-stats` e `/api/admin/*` (token `Bearer`). Limites de uso por IP seguem em memória.

## Testes

`cd api && npm test` roda `node --test`. Testes que precisam de Postgres só rodam com um banco **descartável** (`TEST_DB_NAME` precisa conter `test` ou `descart`; cada arquivo usa um schema próprio):

```
docker run -d --name pgtest -e POSTGRES_USER=naosalvo -e POSTGRES_PASSWORD=t -e POSTGRES_DB=naosalvo_test -p 54329:5432 postgres:16-alpine
TEST_DB_PORT=54329 TEST_DB_PASSWORD=t TEST_DB_NAME=naosalvo_test npm test
```

Sem `TEST_DB_NAME` esses testes são pulados (é o caso do CI, que não tem Postgres).
