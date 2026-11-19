-- 008 · Economia no servidor: estoque de pacotes, idempotência do razão e regras que faltavam.
-- Pacote comprado ou ganho (diário, boas-vindas) fica no estoque até ser aberto; abrir = marcar usado_em
-- e gravar o sorteio em pacotes_abertos, tudo numa transação (ver api/economia/servico.js).

CREATE TABLE pacotes_estoque (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL REFERENCES pacotes_tipo(id) ON UPDATE CASCADE,
  colecao_id  TEXT REFERENCES colecoes(id) ON UPDATE CASCADE,   -- só no pacote de escopo "colecao"
  origem      TEXT NOT NULL CHECK (origem IN ('compra', 'diario', 'boas', 'admin')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  usado_em    TIMESTAMPTZ,
  aberto_id   BIGINT REFERENCES pacotes_abertos(id) ON DELETE SET NULL,
  CHECK (aberto_id IS NULL OR usado_em IS NOT NULL)
);
CREATE INDEX pacotes_estoque_fechados_idx ON pacotes_estoque (usuario_id, criado_em) WHERE usado_em IS NULL;
CREATE INDEX pacotes_estoque_usuario_tipo_idx ON pacotes_estoque (usuario_id, tipo);

-- O razão só ganha linhas novas; estes motivos valem uma vez por (usuário, referência), então um
-- reenvio ou corrida não paga duas vezes: visita do dia (ref = AAAA-MM-DD), carta nova (ref = carta),
-- coleção completa (ref = coleção).
CREATE UNIQUE INDEX eventos_xp_unico_idx ON eventos_xp (usuario_id, motivo, ref)
  WHERE motivo IN ('visita_diaria', 'carta_nova', 'colecao_completa');
CREATE UNIQUE INDEX movimentos_moeda_unico_idx ON movimentos_moeda (usuario_id, motivo, ref)
  WHERE motivo = 'colecao_completa';

-- Regras de economia (tabela criada na 004). O seed grava as mesmas chaves com DO NOTHING;
-- aqui entram também para o servidor funcionar sem depender da ordem de carga.
INSERT INTO regras_economia (chave, valor, descricao) VALUES
  ('valor_repetida', '{"Comum":5,"Relevante":10,"Raro":20,"Relíquia":40,"Lendário":80,"Mítico":150}', 'Moedas que uma carta repetida vale, por raridade'),
  ('recompensa_moedas', '{"envio_aprovado":25,"link_antigo":5,"colecao_completa":100}', 'Moedas por ação'),
  ('xp_ganho', '{"visita":10,"pacote":5,"envio_aprovado":50,"link_antigo":10,"colecao_completa":100,"carta_nova":{"Comum":2,"Relevante":4,"Raro":8,"Relíquia":15,"Lendário":30,"Mítico":60}}', 'XP por ação'),
  ('limites', '{"pacote_diario_max":7,"fuso":"America/Sao_Paulo"}', 'Pacote diário acumula até o máximo; o "dia" da visita segue o fuso')
ON CONFLICT (chave) DO NOTHING;
