#!/usr/bin/env bash
# node:test: tests/ da raiz (player etc.) + testes dentro de api/. Sem nenhum teste = passa vazio.
# Não usa `node --test tests/` (diretório falha no Node 24/Windows): lista os arquivos explicitamente.
set -u
cd "$(dirname "$0")/../.."
mapfile -t arquivos < <(find tests api \
  \( -path '*/node_modules' -prune \) -o \
  -type f \( -name '*.test.js' -o -name '*.test.mjs' -o -name '*.test.cjs' \) -print 2>/dev/null | sort)
if [ "${#arquivos[@]}" -eq 0 ]; then
  echo "run-api-tests: nenhum teste ainda, passando vazio"; exit 0
fi
# testes da api podem importar pg: instala dependências se faltarem
if [ ! -d api/node_modules ] && [ -f api/package.json ]; then
  (cd api && npm install --omit=dev --no-audit --no-fund) || exit 1
fi
echo "run-api-tests: ${#arquivos[@]} arquivo(s)"; printf '  %s\n' "${arquivos[@]}"
exec node --test "${arquivos[@]}"
