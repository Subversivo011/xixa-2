-- 001 · Linha de base: as tabelas que o server.js criava "na mão" antes das migrações.
-- Em banco que já tem essas tabelas (naosalvo, naosalvo_dev) não muda nada;
-- em banco vazio cria no mesmo formato, para as migrações seguintes converterem.

CREATE TABLE IF NOT EXISTS votos (
  id   TEXT PRIMARY KEY,
  up   INT NOT NULL DEFAULT 0,
  down INT NOT NULL DEFAULT 0,
  sum  INT NOT NULL DEFAULT 0,
  n    INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS feedback (
  id        BIGSERIAL PRIMARY KEY,
  tipo      TEXT NOT NULL,
  msg       TEXT NOT NULL,
  contato   TEXT,
  pagina    TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comentarios (
  id        BIGSERIAL PRIMARY KEY,
  meme_id   TEXT NOT NULL,
  autor     TEXT NOT NULL,
  texto     TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comentarios_meme_idx ON comentarios (meme_id, criado_em);

-- versão antiga de contribuidores guardava e-mail; hoje guarda o usuário do Discord
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'contribuidores' AND column_name = 'email') THEN
    DROP INDEX IF EXISTS contribuidores_email_uq;
    ALTER TABLE contribuidores RENAME COLUMN email TO discord;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contribuidores (
  id            BIGSERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  nick          TEXT NOT NULL,
  discord       TEXT NOT NULL,
  areas         TEXT[] NOT NULL DEFAULT '{}',
  area_outros   TEXT,
  horas_semana  INT NOT NULL,
  experiencia   TEXT NOT NULL,
  ferramentas   TEXT NOT NULL,
  mensagem      TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contribuidores_discord_uq ON contribuidores (lower(discord));
