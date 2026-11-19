-- 006 · Moderação: envios, votos_moderacao, edicoes, remocoes, log_auditoria.

CREATE TABLE envios (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  ano              INT,
  categoria        TEXT REFERENCES categorias(nome) ON UPDATE CASCADE,
  url              TEXT NOT NULL,
  url_normalizada  TEXT,                       -- para a checagem anti-duplicação (plano 4.3)
  descricao        TEXT,
  status           TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'aprovado', 'rejeitado', 'ajuste', 'duplicado')),
  motivo           TEXT,
  meme_id          TEXT REFERENCES memes(id) ON UPDATE CASCADE ON DELETE SET NULL, -- preenchido quando vira meme
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  decidido_em      TIMESTAMPTZ
);
CREATE INDEX envios_status_idx ON envios (status);
CREATE INDEX envios_usuario_idx ON envios (usuario_id, criado_em DESC);
CREATE INDEX envios_url_idx ON envios (url_normalizada);

-- consenso de 2 votos iguais; desempate do Dono de comunidade
CREATE TABLE votos_moderacao (
  envio_id      BIGINT NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  moderador_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  voto          TEXT NOT NULL CHECK (voto IN ('aprovado', 'rejeitado', 'ajuste', 'duplicado')),
  motivo        TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (envio_id, moderador_id)
);
CREATE INDEX votos_moderacao_moderador_idx ON votos_moderacao (moderador_id);

CREATE TABLE edicoes (
  id               BIGSERIAL PRIMARY KEY,
  meme_id          TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  usuario_id       BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  antes            JSONB NOT NULL,
  depois           JSONB NOT NULL,
  patrulhada_por   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  patrulhada_em    TIMESTAMPTZ,
  revertida        BOOLEAN NOT NULL DEFAULT false,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX edicoes_meme_idx ON edicoes (meme_id, criado_em DESC);
CREATE INDEX edicoes_pendentes_idx ON edicoes (criado_em DESC) WHERE patrulhada_por IS NULL AND NOT revertida;

CREATE TABLE remocoes (
  id              BIGSERIAL PRIMARY KEY,
  meme_id         TEXT REFERENCES memes(id) ON DELETE SET NULL ON UPDATE CASCADE,
  solicitante     TEXT NOT NULL,
  motivo          TEXT NOT NULL,
  contato         TEXT,
  status          TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'atendida', 'negada')),
  prazo_em        TIMESTAMPTZ NOT NULL DEFAULT now() + interval '72 hours',
  respondido_por  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  respondido_em   TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX remocoes_status_idx ON remocoes (status, prazo_em);

-- Só insere, nunca altera. Sem FK em usuario_id de propósito: o log sobrevive à exclusão da conta (LGPD)
-- e um ON DELETE SET NULL seria um UPDATE, que a regra abaixo proíbe.
CREATE TABLE log_auditoria (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT,
  acao        TEXT NOT NULL,
  alvo        TEXT,
  detalhe     JSONB NOT NULL DEFAULT '{}',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX log_auditoria_criado_idx ON log_auditoria (criado_em DESC);
CREATE INDEX log_auditoria_usuario_idx ON log_auditoria (usuario_id, criado_em DESC);

CREATE FUNCTION log_auditoria_imutavel() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'log_auditoria é somente de inserção (% bloqueado)', TG_OP;
END $$;
CREATE TRIGGER log_auditoria_sem_alteracao
  BEFORE UPDATE OR DELETE ON log_auditoria
  FOR EACH ROW EXECUTE FUNCTION log_auditoria_imutavel();
CREATE TRIGGER log_auditoria_sem_truncate
  BEFORE TRUNCATE ON log_auditoria
  FOR EACH STATEMENT EXECUTE FUNCTION log_auditoria_imutavel();
