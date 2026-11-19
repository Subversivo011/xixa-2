-- 004 · Álbum e economia: colecoes, cartas, inventario_cartas, pacotes_tipo, pacotes_abertos,
--       movimentos_moeda, eventos_xp, regras_economia.

CREATE TABLE colecoes (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  icone        TEXT,
  cor          TEXT,
  cores_fundo  TEXT[] NOT NULL DEFAULT '{}',
  sobre        TEXT,
  ordem        INT NOT NULL DEFAULT 0
);

CREATE TABLE cartas (
  id          TEXT PRIMARY KEY,                -- "<colecao>-<indice>", igual ao id usado pelo álbum
  colecao_id  TEXT NOT NULL REFERENCES colecoes(id) ON UPDATE CASCADE,
  numero      INT NOT NULL,                    -- posição na coleção (1..n)
  nome        TEXT NOT NULL,
  emoji       TEXT,
  raridade    TEXT NOT NULL CHECK (raridade IN ('Comum', 'Relevante', 'Raro', 'Relíquia', 'Lendário', 'Mítico')),
  meme_id     TEXT REFERENCES memes(id) ON UPDATE CASCADE ON DELETE SET NULL,
  UNIQUE (colecao_id, numero)
);
CREATE INDEX cartas_colecao_idx ON cartas (colecao_id);
CREATE INDEX cartas_raridade_idx ON cartas (raridade);
CREATE INDEX cartas_meme_idx ON cartas (meme_id) WHERE meme_id IS NOT NULL;

CREATE TABLE inventario_cartas (
  usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  carta_id     TEXT NOT NULL REFERENCES cartas(id) ON UPDATE CASCADE,
  quantidade   INT NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  primeira_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, carta_id)
);
CREATE INDEX inventario_cartas_carta_idx ON inventario_cartas (carta_id);

CREATE TABLE pacotes_tipo (
  id                 TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
  descricao          TEXT,
  preco              INT NOT NULL DEFAULT 0 CHECK (preco >= 0),
  cartas             INT NOT NULL DEFAULT 5 CHECK (cartas > 0),
  chances            JSONB NOT NULL,           -- {"Comum":44,"Relevante":26,...} peso por raridade
  garantia           TEXT CHECK (garantia IN ('Comum', 'Relevante', 'Raro', 'Relíquia', 'Lendário', 'Mítico')),
  escopo             TEXT NOT NULL DEFAULT 'todas' CHECK (escopo IN ('todas', 'colecao')),
  limite_por_usuario INT CHECK (limite_por_usuario > 0), -- NULL = sem limite; "Boas-vindas" = 1
  icone              TEXT,
  gradiente          TEXT,
  ativo              BOOLEAN NOT NULL DEFAULT true,
  ordem              INT NOT NULL DEFAULT 0
);

CREATE TABLE pacotes_abertos (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL REFERENCES pacotes_tipo(id) ON UPDATE CASCADE,
  colecao_id  TEXT REFERENCES colecoes(id) ON UPDATE CASCADE, -- só nos pacotes de escopo "colecao"
  cartas      JSONB NOT NULL,                  -- ids sorteados, em ordem
  semente     TEXT,                            -- para auditar/reproduzir o sorteio
  aberto_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pacotes_abertos_usuario_idx ON pacotes_abertos (usuario_id, aberto_em DESC);
CREATE INDEX pacotes_abertos_tipo_idx ON pacotes_abertos (usuario_id, tipo);

-- Razão de moedas: o saldo é a soma. Só se insere; correção = linha nova com sinal oposto.
CREATE TABLE movimentos_moeda (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor       INT NOT NULL CHECK (valor <> 0),
  motivo      TEXT NOT NULL,                   -- ex.: pacote_comprado, carta_repetida, envio_aprovado
  ref         TEXT,                            -- id do que originou (pacote, envio, carta...)
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movimentos_moeda_usuario_idx ON movimentos_moeda (usuario_id, criado_em DESC);

CREATE TABLE eventos_xp (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor       INT NOT NULL CHECK (valor <> 0),
  motivo      TEXT NOT NULL,                   -- ex.: visita_diaria, carta_nova, envio_aprovado
  ref         TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eventos_xp_usuario_idx ON eventos_xp (usuario_id);
CREATE INDEX eventos_xp_usuario_data_idx ON eventos_xp (usuario_id, criado_em DESC);
CREATE INDEX eventos_xp_criado_idx ON eventos_xp (criado_em);                        -- ranking por temporada

-- Valores de recompensa fora do código (plano 4.3): editáveis pelo admin.
CREATE TABLE regras_economia (
  chave          TEXT PRIMARY KEY,             -- ex.: valor_repetida, recompensa_moedas, xp_ganho
  valor          JSONB NOT NULL,
  descricao      TEXT,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL
);
