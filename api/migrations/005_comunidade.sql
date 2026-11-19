-- 005 · Comunidade: votos, comentarios, feedback, contribuidores.
-- Conversão SEM perda de dados:
--   votos        → a tabela atual (agregada e anônima) vira votos_legado, intacta. "votos" passa a ser por usuário.
--   comentarios  → ganha usuario_id e oculto; as linhas antigas ficam (autor = nome digitado, usuario_id NULL).
--   feedback     → ganha usuario_id e tratado.
--   contribuidores → sem mudança de formato (criada na 001); só ganha índice de listagem.

-- ---- votos ----
ALTER TABLE votos RENAME TO votos_legado;
ALTER INDEX votos_pkey RENAME TO votos_legado_pkey;
COMMENT ON TABLE votos_legado IS
  'Votos agregados e anônimos do protótipo (id = meme, up/down/sum/n). Não tem dono; a API atual ainda lê e escreve aqui até a Fase 2.';

CREATE TABLE votos (
  usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  meme_id        TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  curtida        SMALLINT NOT NULL DEFAULT 0 CHECK (curtida IN (-1, 0, 1)),
  estrelas       SMALLINT NOT NULL DEFAULT 0 CHECK (estrelas BETWEEN 0 AND 5),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, meme_id)            -- um voto por pessoa por meme
);
CREATE INDEX votos_meme_idx ON votos (meme_id);

-- ---- comentarios ----
-- meme_id ainda não tem FK validada: o acervo só chega com o seed (api/seed/acervo.js).
-- A FK entra como NOT VALID (vale para linhas novas) e o seed a valida depois de carregar os memes.
ALTER TABLE comentarios
  ADD COLUMN usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN oculto BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN autor DROP NOT NULL;            -- passa a vir do usuário; fica só nas linhas antigas
ALTER TABLE comentarios
  ADD CONSTRAINT comentarios_meme_fk FOREIGN KEY (meme_id) REFERENCES memes(id) ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
CREATE INDEX comentarios_usuario_idx ON comentarios (usuario_id) WHERE usuario_id IS NOT NULL;
-- comentarios_meme_idx (meme_id, criado_em) já existe desde a 001

-- ---- feedback ----
ALTER TABLE feedback
  ADD COLUMN usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN tratado BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX feedback_pendentes_idx ON feedback (criado_em DESC) WHERE NOT tratado;

-- ---- contribuidores ----
CREATE INDEX contribuidores_criado_idx ON contribuidores (criado_em DESC);
