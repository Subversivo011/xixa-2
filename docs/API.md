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

Rotas marcadas com 🔒 exigem usuário (ver **Login com Discord e sessão**). Erros de regra: `{ erro }` com 400, 402 (moedas insuficientes), 404 ou 409. Até 60 ações de escrita por usuário a cada 10 min (429).

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

## Login com Discord e sessão

OAuth2 do Discord (scope `identify`). Quem usa: o site abre `/api/auth/discord?voltar=/album.html`, o usuário autoriza no Discord e volta para a página de origem já logado.

| Rota | Descrição |
|---|---|
| `GET /api/auth/discord?voltar=/caminho` | Gera um `state` aleatório, guarda no cookie `ns_oauth` (httpOnly, 10 min, só viaja para `/api/auth`) e redireciona (302) ao Discord. `voltar` só aceita **caminho relativo do próprio site**; qualquer outra coisa (`https://…`, `//…`, `/\\…`, `javascript:`) vira `/` |
| `GET /api/auth/discord/callback` | Confere o `state` com o cookie (`400` se faltar ou divergir), troca o `code`, lê `/users/@me`, cria ou atualiza `usuarios` + `contas_oauth`, abre a sessão e redireciona para `voltar` (revalidado). Falhas voltam para a mesma página com `?login=` **`negado`** (cancelou no Discord), **`erro`** (Discord recusou o code), **`banido`** (conta suspensa: não abre sessão), **`nao_membro`** (só se `DISCORD_EXIGIR_MEMBRO=1`) |
| `POST /api/auth/sair` | Apaga a sessão no banco e limpa o cookie. Exige `X-CSRF`. Sem sessão, só limpa o cookie |
| 🔒 `GET /api/eu` | `{ usuario: { id, apelido, avatar_gato }, patente, proxima_patente, moedas, xp, csrf }`. `401` se não estiver logado. **O `csrf` daqui vai no header `X-CSRF` das chamadas que alteram dados** |

**State assinado.** O cookie `ns_oauth` é `<state>.<destino>.<emitido em>.<hmac>`: HMAC-SHA256 com chave derivada do client secret. O servidor recusa (`400`) assinatura inválida, destino adulterado, cookie com mais de 10 minutos (validado no servidor, não só pelo `Max-Age`) ou emitido "no futuro". O `state` também precisa bater com o da URL de volta.

Primeiro login cria o usuário com apelido único derivado do nome no Discord (acentos removidos, 3 a 20 caracteres; colisão ganha sufixo numérico: `Ana`, `Ana2`…) e um gato inicial determinístico pelo id do Discord. Um login seguinte reaproveita o usuário e só atualiza o nome de exibição. Rate limit: 30 chamadas por IP a cada 10 min nas rotas de auth (`429`).

**Sessão.** Cookie `ns_sessao`: `HttpOnly`, `Secure`, `SameSite=Lax`, 30 dias. O valor é um token aleatório de 256 bits; **o banco guarda só o sha256 dele** (`sessoes.id`), então um vazamento do banco não entrega sessões. Renovação deslizante: se passou mais de 1 dia desde a última renovação, o uso empurra a expiração e reemite o cookie, com teto absoluto de 90 dias desde a criação. No máximo 10 sessões por usuário (a mais antiga cai). Expiradas são ignoradas na leitura e apagadas na subida da API e a cada hora.

**CSRF.** Rota autenticada por cookie que altera dados (POST/PUT/PATCH/DELETE) exige **`X-CSRF`** igual ao token da sessão (vem em `GET /api/eu`; é derivado do token do cookie, que o JavaScript não lê) e, se o navegador mandar `Origin`, ele precisa ser o do site. Falha = `403`. GET não exige. O stub de teste (header, sem cookie) não precisa.

**Patente.** `lib/patente.js`: a patente é calculada no servidor pela soma do razão `eventos_xp` e pela tabela `patentes`. Ao registrar uma rota, `{ autenticada: true }` exige usuário e `{ patente: 'moderador' }` exige também essa patente ou maior (id ou nome: `'banda_larga'`, `'Banda larga'`). `401` sem login, `403` abaixo da patente (`{ erro, patente_atual }`), `503` se a tabela `patentes` estiver vazia. Todas as rotas de economia usam a sessão; nenhuma rota de admin por patente foi criada ainda.

**Configuração (nunca no repositório, nunca em log).** Segredos só por arquivo (Docker secrets): `DISCORD_CLIENT_ID_FILE`, `DISCORD_CLIENT_SECRET_FILE` e, opcional, `DISCORD_GUILD_ID_FILE`. **O client secret por variável (`DISCORD_CLIENT_SECRET`) só vale em dev/test** (mesma allowlist do stub: `DB_NAME` com token `test`/`dev` e `NODE_ENV` diferente de `production`); em produção a variável é ignorada, com um aviso no log que não mostra o valor. `DISCORD_REDIRECT_URI` por variável (https obrigatório fora de localhost) e precisa ser **exatamente** a URL cadastrada no portal do Discord. Sem client id/secret/redirect a API sobe normalmente e as rotas de login respondem `503`. Opcionais: `DISCORD_EXIGIR_MEMBRO=1` (só entra quem está no servidor do `DISCORD_GUILD_ID`; pede também o scope `guilds`; ver **Decisões de produto**), `SITE_ORIGIN` (origem do site para o CSRF; padrão = origem do redirect) e `COOKIE_SECURE=0` (só para teste local sem HTTPS). Nas stacks: `docker-stack.dev.yml` e `deploy/auto/stack.dev.yml` usam `naosalvo_dev_discord_client_id`, `naosalvo_dev_discord_client_secret` e `naosalvo_discord_guild_id`; `docker-stack.yml` e `deploy/auto/stack.main.yml` usam `naosalvo_discord_client_id`, `naosalvo_discord_client_secret` e `naosalvo_discord_guild_id`. A access token do Discord é usada só durante o callback e descartada (não é gravada).

## Autenticação de teste (stub)

`api/auth-stub.js` continua existindo **só para dev e testes**: com `AUTH_STUB=1`, o header `X-Test-User: <apelido>` (3 a 20 letras, números, `_`, `.`, `-`) identifica o usuário e o cria na primeira chamada. A sessão do login Discord tem prioridade; o stub só entra se não houver sessão válida. Sem a variável, o header é ignorado.

- **Só dev e teste.** Quem manda o header vira aquele usuário. A guarda é uma **allowlist**: o stub só liga se `DB_NAME` é de teste/dev **por token** (`naosalvo_dev`, `naosalvo_test`, `test_x`, `dev_x` ou nome terminando em `test`/`dev`; `prod_devel` não vale) **e** `NODE_ENV` não é `production` (sem diferenciar maiúsculas). `NODE_ENV=test` sozinho não basta. Qualquer outro caso (`naosalvo`, `naosalvo_staging`, banco ausente, `NODE_ENV=Production`, `naosalvo` com `NODE_ENV=test`) faz a API **recusar subir**, com erro claro, antes de tocar no banco. Nunca coloque `AUTH_STUB` em `docker-stack.yml`.
- Em produção as rotas 🔒 só aceitam a sessão do login Discord.

### Fora do escopo deste PR (anotado)

- Prefixo `__Host-` nos nomes dos cookies (exige Path=/ e sem Domain; o cookie de state usa `Path=/api/auth`, então ficaria só a sessão): melhoria futura.
- Login novo **não** revoga as sessões anteriores do usuário (até 10 coexistem, uma por navegador/dispositivo). Uma tela "sair de todos os dispositivos" é o caminho natural; hoje basta apagar as linhas de `sessoes` do usuário.

## Decisões de produto

### Fechadas

1. **Repetida fica no inventário e só vira moeda via `POST /api/album/reciclar`.** Abrir pacote soma a carta em `inventario_cartas.quantidade` e informa `valor_das_repetidas`, sem pagar. Assim a repetida continua existindo como carta, o que deixa espaço para **troca de figurinhas** no futuro. Consequência: `docs/subversivo011/economia-e-escassez.md` ("toda repetida vira moeda na hora") está **desatualizado** nesse ponto; a nota foi registrada no topo daquele arquivo. Os números da simulação valem como referência de ritmo, não como descrição exata.

2. **Exigir membro do servidor do Discord em produção: ligar `DISCORD_EXIGIR_MEMBRO=1`.** O código já suporta (testado com mock): quem não está no servidor volta para a página com `?login=nao_membro`, sem sessão; o pedido de autorização passa a incluir o scope `guilds` (a tela de consentimento mostra "ver seus servidores"). **Ainda não está ligado em nenhuma stack**: para ligar, acrescentar `DISCORD_EXIGIR_MEMBRO: "1"` ao `environment` da api em `docker-stack.yml` e `deploy/auto/stack.main.yml` (o `DISCORD_GUILD_ID_FILE` já está montado) e rebuild do deployer. Em dev, deixar desligado para testar com contas avulsas.

### Em aberto (implementado como no protótipo; confirmar com o grupo antes de divulgar)

1. **Boas-vindas na primeira visita** (`POST /api/visita`), não "no cadastro" como diz o documento de economia. Com o login Discord já existe cadastro (primeiro login); mover o pacote para o momento da criação da conta é decisão em aberto.
2. **Preço do pacote Clássico (150 moedas)**: número da simulação, ainda não validado pelo grupo. Fica em `pacotes_tipo.preco`.
3. **Pacote diário acumula até 7** e o "dia" segue `America/Sao_Paulo` (`regras_economia.limites`).
4. **Sem tiragem numerada nos Míticos** (é recomendação do documento de economia, não implementada).

## Configuração

`TRUSTED_PROXY_HOPS` (padrão **2**) diz quantos proxies confiáveis ficam entre o cliente e a API. É o que define o **IP do cliente** usado no rate limit, nos hashes anti-spam e em `sessoes.ip`. O `X-Forwarded-For` é uma lista que cada proxy acrescenta à direita; o que está à esquerda pode ser forjado pelo cliente. Na cadeia cliente → Cloudflare → Traefik → API o Cloudflare acrescenta o IP real e o Traefik acrescenta o IP da borda do Cloudflare, então o IP do cliente é o item na posição N **a partir da direita** (N=2: o penúltimo): `forjado, IP-real, borda-CF` → `IP-real`. Cadeia com menos itens que N usa o último; sem cabeçalho (ou item que não pareça IP) usa o IP do socket; `0` ignora o cabeçalho. Se mudar a infraestrutura (outro proxy na frente, ou sem Cloudflare), ajuste o valor: ver o runbook. O IP puro não é gravado em tabelas de anti-spam (só HMAC); `sessoes.ip` guarda o IP para auditoria da sessão.

`DB_POOL_MAX` define o tamanho do pool de conexões do pg (inteiro de 1 a 100; padrão 10).

## Rotas já existentes (comportamento inalterado)

`/api/contribuidores`, `/api/votos` (agregado anônimo, tabela `votos_legado`), `/api/feedback`, `/api/comentarios`, `/api/links`, `/api/links/aprovados`, `/api/yt-stats` e `/api/admin/*` (token `Bearer`).

**Sobe.Desce** (migração 009): `POST /api/eventos` `{id, tipo: "visita"|"clique"}` conta 1 por meme, IP (HMAC) e dia; `GET /api/sobedesce?tipo=visitados|clicados&periodo=hoje|sempre` devolve `{sobe, desce}` (hoje: compara com ontem; sempre: mais e menos acessados).

**Memepédia** (migração 010): `GET /api/memepedia[?id=]` (último texto aprovado de cada parte), `POST /api/memepedia` `{id, campo, texto, fonte?, autor}` entra como pendente; moderação em `GET /api/admin/memepedia` e `POST /api/admin/memepedia/:id {status}`. Campos: origem, porque, usos, rede, hoje, curiosidades. Limites de uso por IP seguem em memória.

## Testes

`cd api && npm test` roda `node --test`. Testes que precisam de Postgres só rodam com um banco **descartável** (`TEST_DB_NAME` precisa conter `test` ou `descart`; cada arquivo usa um schema próprio):

```
docker run -d --name pgtest -e POSTGRES_USER=naosalvo -e POSTGRES_PASSWORD=t -e POSTGRES_DB=naosalvo_test -p 54329:5432 postgres:16-alpine
TEST_DB_PORT=54329 TEST_DB_PASSWORD=t TEST_DB_NAME=naosalvo_test npm test
```

Sem `TEST_DB_NAME` esses testes são pulados (é o caso do CI, que não tem Postgres).
