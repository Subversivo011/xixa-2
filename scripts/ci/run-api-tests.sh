#!/usr/bin/env bash
# node:test da api. Sem arquivos de teste ainda = passa vazio.
set -u
cd "$(dirname "$0")/../../api"
found=$(find . -path ./node_modules -prune -o \( -name '*.test.js' -o -name '*.test.mjs' -o -path './test/*.js' -o -path './tests/*.js' \) -print -quit)
if [ -z "$found" ]; then
  echo "run-api-tests: nenhum teste ainda, passando vazio"; exit 0
fi
if [ -f package-lock.json ] && [ ! -d node_modules ]; then npm ci; fi
exec node --test
