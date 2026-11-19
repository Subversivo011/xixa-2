# Contribuindo

## Fluxo
1. Branch a partir de `dev`: `git switch -c feat/minha-mudanca dev`.
2. Commits pequenos, mensagem `tipo: resumo` (`feat`, `fix`, `docs`, `chore`).
3. PR para `dev`. CI precisa estar verde. Valide no `naosalvo-dev`.
4. `dev` → `main` só por PR, com migração testada e backup feito (checklist no modelo de PR).
5. Segredos nunca entram no repositório.

## Assets e cache
Ao mudar qualquer `.css` ou `.js` do site, troque o `?v=` em `index.html`, `album.html` e `admin/index.html`. Sem isso o Cloudflare e o navegador servem a versão velha. O CI avisa quando esquecer.

## Memes e imagens
Toda imagem citada em `data.js` precisa existir em `memes/`.

## Checagens locais
Mesmas do CI, na raiz do repositório (Node 22+):

```sh
bash scripts/ci/check-syntax.sh                 # node --check em todos os JS
node scripts/ci/check-images.mjs                # imagens de data.js existem
node scripts/ci/check-asset-versions.mjs dev    # aviso de ?v= (compara com a branch dada; --strict falha)
bash scripts/ci/run-api-tests.sh                # node:test da api
```

## Testes da api
Arquivos `*.test.js` (ou em `api/test/`) com `node:test`. Sem testes, o job passa vazio.
