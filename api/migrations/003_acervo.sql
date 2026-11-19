-- 003 · Acervo: categorias, eras, memes, midias.

CREATE TABLE categorias (
  nome   TEXT PRIMARY KEY,
  icone  TEXT,
  emoji  TEXT,
  ordem  INT NOT NULL DEFAULT 0
);

-- uma linha por era: 2004..2019 têm ano_fim = ano; "2020+" tem ano = 2020 e ano_fim NULL (aberta)
CREATE TABLE eras (
  ano      INT PRIMARY KEY,                 -- ano em que a era começa
  ano_fim  INT,                             -- NULL = em aberto
  rotulo   TEXT NOT NULL,                   -- como aparece no site: "2004", "2020+"
  lema     TEXT NOT NULL,
  texto    TEXT NOT NULL
);

CREATE TABLE memes (
  id            TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,80}$'),  -- slug, mesmo formato aceito em /api/votos
  titulo        TEXT NOT NULL,
  ano           INT NOT NULL,
  data          DATE,
  categoria     TEXT NOT NULL REFERENCES categorias(nome) ON UPDATE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'video' CHECK (tipo IN ('video', 'foto')),
  -- as 6 raridades das cartas + 'Clássico' (raridade padrão de meme aprovado pela comunidade)
  raridade      TEXT NOT NULL CHECK (raridade IN ('Comum', 'Relevante', 'Raro', 'Relíquia', 'Lendário', 'Mítico', 'Clássico')),
  emoji         TEXT,
  descricao     TEXT,
  autor         TEXT,
  duracao       INT,                           -- segundos
  youtube_id    TEXT CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  adicionado_em DATE NOT NULL DEFAULT current_date,
  status        TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto', 'removido'))
);
CREATE INDEX memes_ano_idx ON memes (ano);
CREATE INDEX memes_categoria_idx ON memes (categoria);
CREATE INDEX memes_status_idx ON memes (status);

CREATE TABLE midias (
  id           BIGSERIAL PRIMARY KEY,
  meme_id      TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('imagem', 'video_arquivo')),
  caminho      TEXT NOT NULL,                  -- relativo à raiz do site, ex. memes/arquivo.jpg
  origem_url   TEXT,                           -- de onde a imagem foi baixada (srcImg)
  credito_por  TEXT,
  credito_url  TEXT,
  largura      INT,
  altura       INT,
  ordem        INT NOT NULL DEFAULT 0,
  UNIQUE (meme_id, tipo, caminho)
);
CREATE INDEX midias_meme_idx ON midias (meme_id, ordem);
