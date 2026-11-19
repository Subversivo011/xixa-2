-- 002 · Contas: usuarios, contas_oauth, sessoes, patentes.

CREATE TABLE usuarios (
  id            BIGSERIAL PRIMARY KEY,
  apelido       TEXT NOT NULL CHECK (apelido ~ '^[A-Za-z0-9_.\-]{3,20}$'),
  avatar_gato   JSONB NOT NULL DEFAULT '{}',
  -- xp e moedas são CACHE do razão (eventos_xp / movimentos_moeda); recalculáveis
  xp            BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  moedas        BIGINT NOT NULL DEFAULT 0 CHECK (moedas >= 0),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acesso TIMESTAMPTZ,
  banido        BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX usuarios_apelido_uq ON usuarios (lower(apelido));
CREATE INDEX usuarios_xp_idx ON usuarios (xp DESC) WHERE NOT banido; -- ranking

CREATE TABLE contas_oauth (
  usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  provedor       TEXT NOT NULL CHECK (provedor IN ('discord')),
  provedor_id    TEXT NOT NULL,
  nome_exibicao  TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provedor, provedor_id)
);
CREATE INDEX contas_oauth_usuario_idx ON contas_oauth (usuario_id);

CREATE TABLE sessoes (
  id          TEXT PRIMARY KEY,                 -- hash (sha256) do token do cookie; o token em si nunca é guardado
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em   TIMESTAMPTZ NOT NULL,
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX sessoes_usuario_idx ON sessoes (usuario_id);
CREATE INDEX sessoes_expira_idx ON sessoes (expira_em); -- job que apaga as expiradas

CREATE TABLE patentes (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  xp_minimo   INT NOT NULL UNIQUE CHECK (xp_minimo >= 0),
  cor         TEXT,
  descricao   TEXT,
  permissoes  TEXT[] NOT NULL DEFAULT '{}'
);
