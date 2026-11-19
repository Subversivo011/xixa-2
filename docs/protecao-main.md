# Proteção do `main`: passo a passo

**Este documento só descreve. Nada foi aplicado no repositório.** Quem tem permissão de admin no GitHub faz os passos abaixo.

Por quê: o push no `main` dispara deploy automático em produção. Sem proteção, qualquer commit direto publica código sem revisão nem CI.

## Pré-requisito

O workflow `.github/workflows/ci.yml` precisa estar em `main` e ter **rodado ao menos uma vez** (um PR para `main` ou `dev`). O GitHub só oferece como check obrigatório os jobs que já executaram no repositório nos últimos 7 dias.

Jobs do CI (nomes exatos que aparecem na busca de checks):

| Job (`name:`) | Bloqueia? |
|---|---|
| `Sintaxe JS (site + api)` | sim |
| `Imagens do data.js existem` | sim |
| `Testes da api (node:test)` | sim |
| `Migrações sobem do zero (Postgres)` | sim |
| `Versão ?v= dos assets (aviso)` | **não** (só avisa; não marque como obrigatório) |

## Passo a passo (Rulesets, recomendado)

1. Repositório no GitHub → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**.
2. **Ruleset name:** `proteger-main`. **Enforcement status:** primeiro **Evaluate** (só registra violações) para testar sem bloquear; depois mude para **Active**.
3. **Bypass list:** deixe vazia. Se precisar de uma saída de emergência, adicione só o papel *Repository admin* e use com consciência (fica auditado).
4. **Target branches** → **Add target** → **Include by pattern** → `main`.
5. Em **Rules**, marque:
   - **Restrict deletions**.
   - **Block force pushes**.
   - **Require a pull request before merging**:
     - *Required approvals*: `1`.
     - *Dismiss stale pull request approvals when new commits are pushed*: ligado.
     - *Require review from Code Owners*: ligado depois de ajustar `.github/CODEOWNERS` com usuários reais (hoje é placeholder).
     - *Require approval of the most recent reviewable push*: ligado (quem empurrou por último não aprova o próprio).
     - *Require conversation resolution before merging*: ligado.
   - **Require status checks to pass**:
     - *Require branches to be up to date before merging*: ligado.
     - **Add checks**: busque e adicione os quatro jobs marcados "sim" na tabela acima.
   - **Require linear history**: opcional (obriga squash/rebase, sem merge commit).
6. **Create**. Abra um PR de teste para `main` e confirme que o botão de merge fica bloqueado até aprovação e CI verde.
7. Troque **Evaluate** por **Active**.

### Alternativa: Branch protection rule clássica

**Settings** → **Branches** → **Add branch ruleset / Add classic branch protection rule** → *Branch name pattern* `main` → mesmas opções (PR com 1 aprovação, status checks, *Do not allow bypassing the above settings*, sem force push, sem deleção).

## Proteger também o `dev` (mais leve)

O `dev` também faz deploy (ambiente `naosalvo-dev`). Sugestão: mesma regra, mas **sem** exigir aprovação, só PR + CI verde, para o fluxo dos colaboradores continuar rápido. Decida antes de aplicar, porque hoje alguns colaboradores mergeiam direto.

## Merge permitido

**Settings** → **General** → **Pull Requests**: deixe só o tipo de merge que a equipe usa (sugestão: *Allow squash merging* e desligue *merge commit*, se escolher histórico linear). Ligue **Automatically delete head branches**.

## Cuidados

- **Deployer:** o `deploy/auto/deployer.sh` só lê o repositório (builda a partir do branch), não faz push, então a proteção não o afeta. Se no futuro alguma automação fizer push direto no `main` (tag, bump de versão), ela será bloqueada: inclua-a na bypass list ou mude o fluxo.
- **Promoção `dev` → `main`:** passa a ser sempre por PR, com o checklist do modelo de PR (backup feito, migração testada, rollback conhecido).
- **Aprovação com um dono só:** com apenas um mantenedor, "1 aprovação" impede o próprio autor de aprovar. Garanta pelo menos duas contas com permissão de escrita, ou aceite a bypass de admin como exceção documentada.
- **Ao renomear um job no `ci.yml`:** o check obrigatório antigo continua pendente para sempre e trava todos os PRs. Atualize a regra junto com o nome.

## Verificação (depois de ativar)

```sh
git push origin HEAD:main        # deve ser recusado: "protected branch" / "Changes must be made through a pull request"
gh api repos/<dono>/<repo>/rulesets --jq '.[] | {name, enforcement}'
```
