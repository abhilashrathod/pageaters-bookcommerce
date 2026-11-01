# 0003 — One pnpm + Turborepo monorepo

- Status: Accepted
- Date: 2026-10-26

## Context

Pageaters was a real online bookstore in India (2022–2026, over 5,000 customers and 50,000+ orders), closed in 2026
over business overhead. Its code lived in three separate repos: the Angular admin, the Express API and the Next.js
storefront. Each had its own npm lockfile, its own copy of the domain types and no shared tooling. To show the system
as a portfolio demo, a reviewer should be able to clone one repo and run everything, and a CMS was being added as a
fourth app.

## Decision

One monorepo managed by **pnpm** workspaces and **Turborepo**, on Node 22 LTS (PLAN.md decision log).

- `apps/{storefront,admin,cms,api}` plus `packages/{shared,api-client,cms-types,config}`, `seed` and `e2e`
  (`pnpm-workspace.yaml`).
- Contracts are zod schemas in `packages/shared`, used by the API, the typed `packages/api-client` and the frontends.
- One `pnpm-lock.yaml`; `turbo.json` runs `build`, `lint`, `typecheck` and `test` with `^build` dependencies and caching.
- The three original histories were imported into their subfolders rather than started fresh (ADR 0008).

A polyrepo was rejected: a contract change would need coordinated releases across four repos, and a reviewer would
have to assemble the system by hand.

## Consequences

- **Tech:** one change can update a schema, the API and both frontends together; Turbo builds shared packages first
  and skips unchanged work. All workspaces must agree on Node and pnpm versions.
- **Business:** for a closed store there is no team per app to justify separate repos; one repo is cheaper to keep
  and easier to evaluate — `pnpm install && pnpm dev` runs the whole store.
- Each app still deploys as its own Vercel project (Phase 10), so the monorepo is a development choice, not a
  runtime coupling.
