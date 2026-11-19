#!/usr/bin/env bash
# Valida que as migrações sobem do zero num Postgres VAZIO e que o seed carrega o acervo.
# Lê DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (mesmas variáveis da api). Use só em banco descartável.
# Seed: nº de memes tem de bater com MEMES.length do data.js; cartas > 0 (hoje 109, ver docs/runbook-banco.md).
set -eu
cd "$(dirname "$0")/../.."
: "${DB_HOST:?defina DB_HOST}" "${DB_USER:?defina DB_USER}" "${DB_PASSWORD:?defina DB_PASSWORD}" "${DB_NAME:?defina DB_NAME}"
export DB_PORT="${DB_PORT:-5432}"

if [ ! -d api/node_modules ]; then (cd api && npm install --omit=dev --no-audit --no-fund); fi

consulta() { # consulta "SQL" -> primeira coluna, sem formatação
  node --input-type=module -e "
    import pg from './api/node_modules/pg/lib/index.js';
    const c = new pg.Client({host:process.env.DB_HOST,port:+process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
    await c.connect(); const r = await c.query(process.argv[1]); console.log(Object.values(r.rows[0])[0]); await c.end();" "$1"
}

esperadas="$(find api/migrations -name '*.sql' | wc -l)"
echo "== 1/4 aplicando $esperadas migrações em banco vazio"
[ "$(consulta "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")" = 0 ] \
  || { echo "::error::banco não está vazio; abortando para não tocar em dados"; exit 1; }
node api/migrate.js

aplicadas="$(consulta "SELECT count(*) FROM schema_migrations")"
echo "aplicadas=$aplicadas esperadas=$esperadas"
[ "$aplicadas" = "$esperadas" ] || { echo "::error::schema_migrations difere dos arquivos"; exit 1; }

echo "== 2/4 segunda execução precisa ser no-op (idempotência + checksum)"
saida="$(node api/migrate.js)"; echo "$saida"
echo "$saida" | grep -q "já está em dia" || { echo "::error::segunda execução aplicou algo"; exit 1; }

echo "== 3/4 seed do acervo"
node api/seed/acervo.js
memes="$(consulta "SELECT count(*) FROM memes")"; cartas="$(consulta "SELECT count(*) FROM cartas")"
echo "memes=$memes cartas=$cartas"
esperados="$(node -e "const v=require('node:vm'),f=require('node:fs');const c=v.createContext({});v.runInContext(f.readFileSync('data.js','utf8')+';this.N=MEMES.length',c);console.log(c.N)")"
echo "memes esperados (data.js)=$esperados"
[ "$memes" = "$esperados" ] && [ "$cartas" -gt 0 ] || { echo "::error::seed não bateu com data.js"; exit 1; }

echo "== 4/4 seed repetido não duplica"
node api/seed/acervo.js >/dev/null
[ "$(consulta "SELECT count(*) FROM memes")" = "$memes" ] || { echo "::error::seed duplicou memes"; exit 1; }
echo "check-migrations: OK"
