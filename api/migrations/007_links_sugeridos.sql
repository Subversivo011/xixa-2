-- 007 · Links do YouTube sugeridos pela comunidade para vídeos sem original (vem do PR #9).
-- Depende do acervo (003): meme_id tem FK para memes, então o seed precisa ter rodado para aceitar sugestões.

CREATE TABLE links_sugeridos (
  id           BIGSERIAL PRIMARY KEY,
  meme_id      TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  yt           TEXT NOT NULL CHECK (yt ~ '^[A-Za-z0-9_-]{11}$'),
  autor        TEXT NOT NULL,                  -- nome digitado (ainda sem conta); vira usuario_id na Fase 2
  ip_hash      TEXT,                           -- HMAC do IP (nunca o IP puro); só para limitar spam
  status       TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_em  TIMESTAMPTZ,
  CONSTRAINT links_sugeridos_unico UNIQUE (meme_id, yt)
);
-- fila do admin: pendentes primeiro, mais recentes antes
CREATE INDEX links_sugeridos_fila_idx ON links_sugeridos (status, criado_em DESC);
-- /api/links/aprovados: último aprovado por meme
CREATE INDEX links_sugeridos_aprovados_idx ON links_sugeridos (meme_id, revisado_em DESC) WHERE status = 'aprovado';
-- limite de pendentes por meme/ip
CREATE INDEX links_sugeridos_spam_idx ON links_sugeridos (meme_id, ip_hash) WHERE status = 'pendente';
