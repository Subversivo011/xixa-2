#!/usr/bin/env bash
# Backup lógico (pg_dump -Fc) dos bancos do Não Salvo, com retenção.
#
# Sem credenciais aqui. A senha vem do ambiente padrão do libpq:
#   PGPASSFILE=/caminho/pgpass   (uma linha por banco: host:porta:banco:usuario:senha)  <- recomendado
#   ou PGPASSWORD_FILE=/caminho/do/secret (usado só se PGPASSWORD não estiver definido; vale p/ todos os bancos)
#
# Variáveis (todas opcionais):
#   PGHOST            host do Postgres                         (padrão: postgres)
#   PGPORT            porta                                    (padrão: 5432)
#   DATABASES         "banco[:usuario] ..." separados por espaço (padrão: "naosalvo:naosalvo naosalvo_dev:naosalvo_dev")
#   BACKUP_DIR        pasta de saída                           (padrão: ./backups)
#   RETENTION_DAYS    apaga dumps com mais de N dias           (padrão: 14; 0 = nunca apaga)
#   MIN_KEEP          nunca deixa menos que N dumps por banco  (padrão: 3)
#
# Saída: $BACKUP_DIR/<banco>/<banco>_AAAAMMDD_HHMMSSZ.dump (UTC). Escreve em .partial e só renomeia depois de
# validar com pg_restore --list, então dump quebrado nunca aparece como backup válido.
# Código de saída 0 só se TODOS os bancos deram certo.
set -u -o pipefail

export PGHOST="${PGHOST:-postgres}"
export PGPORT="${PGPORT:-5432}"
DATABASES="${DATABASES:-naosalvo:naosalvo naosalvo_dev:naosalvo_dev}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MIN_KEEP="${MIN_KEEP:-3}"

if [ -z "${PGPASSWORD:-}" ] && [ -n "${PGPASSWORD_FILE:-}" ]; then
  PGPASSWORD="$(tr -d '\r\n' < "$PGPASSWORD_FILE")"; export PGPASSWORD
fi
case "$RETENTION_DAYS$MIN_KEEP" in *[!0-9]*) echo "RETENTION_DAYS e MIN_KEEP precisam ser inteiros" >&2; exit 2;; esac
command -v pg_dump >/dev/null && command -v pg_restore >/dev/null || { echo "pg_dump/pg_restore não encontrados" >&2; exit 2; }

stamp="$(date -u +%Y%m%d_%H%M%SZ)"
falhas=0

for item in $DATABASES; do
  banco="${item%%:*}"
  usuario=""; [ "$item" != "$banco" ] && usuario="${item#*:}"
  dir="$BACKUP_DIR/$banco"
  final="$dir/${banco}_${stamp}.dump"
  parcial="$final.partial"
  mkdir -p "$dir" || { echo "[$banco] não consegui criar $dir" >&2; falhas=$((falhas+1)); continue; }

  args=(-Fc --no-owner --file="$parcial" --dbname="$banco")
  [ -n "$usuario" ] && args+=(--username="$usuario")

  if pg_dump "${args[@]}" && pg_restore --list "$parcial" >/dev/null && mv "$parcial" "$final"; then
    echo "[$banco] ok: $final ($(wc -c < "$final") bytes)"
  else
    echo "[$banco] FALHOU" >&2; rm -f "$parcial"; falhas=$((falhas+1)); continue
  fi

  # retenção: remove dumps antigos, mas sempre preserva os MIN_KEEP mais novos
  if [ "$RETENTION_DAYS" -gt 0 ]; then
    total="$(find "$dir" -maxdepth 1 -name "${banco}_*.dump" | wc -l)"
    find "$dir" -maxdepth 1 -name "${banco}_*.dump" -mtime +"$RETENTION_DAYS" -print | sort | while read -r velho; do
      [ "$total" -le "$MIN_KEEP" ] && break
      rm -f "$velho" && total=$((total-1)) && echo "[$banco] retenção: removido $velho"
    done
  fi
done

[ "$falhas" -eq 0 ] || { echo "pg-backup: $falhas banco(s) com falha" >&2; exit 1; }
echo "pg-backup: tudo certo"
