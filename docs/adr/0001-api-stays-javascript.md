# 0001 — The API stays JavaScript

- Status: Accepted
- Date: 2026-10-28

## Context

Every other workspace in the monorepo (storefront, admin, CMS, `packages/*`, the seed) is TypeScript. The API
(`apps/api`) is the original 2022–2024 Express + Mongoose backend: 93 CommonJS files, about 9,000 lines, with
`order.controller.js` alone at 1,600 lines. The plan first called for converting it to strict TypeScript and ESM
before the Phase 4 restructuring (layering, adapters, security fixes).

That conversion touches every file, and Phase 4 then rewrites most of the same files again as it moves logic into
services, replaces Joi with zod and removes code that does not fit a serverless API. Doing both means reworking the
same code twice.

The API's contracts are already defined once, as zod schemas in `@pageaters/shared`. That package is ESM-only, and
Node 22 loads ES modules from CommonJS with a plain `require()` (no flag or warning on Node 22.23).

## Decision

`apps/api` stays JavaScript and CommonJS. It is not converted to TypeScript or ESM, and new API code is written in
JavaScript.

- Request validation and response shapes use the zod schemas from `@pageaters/shared` at runtime (a `validate()`
  middleware, and the same schemas feed the OpenAPI spec at `/docs`).
- Adapter interfaces (payments, SMS, email, shipping, storage) are documented with JSDoc.
- The API's quality gates are ESLint and tests. It has no `typecheck` or TypeScript `build` script; Turbo skips it
  for those tasks.

## Consequences

- Phase 4 concentrates on the changes that matter for the demo — dependency upgrades, layering, adapters, security
  and demo-mode guards — instead of a file-by-file conversion.
- Nothing checks at compile time that the API's responses match the shared schemas. Drift shows up at runtime, so
  the API's tests parse real responses through the `@pageaters/shared` schemas (contract tests), and the api-client
  can validate responses at runtime (`validate: true`).
- The AGENTS.md rule "TypeScript `strict` everywhere" carries an explicit exception for `apps/api`.
- The original backend's language and module style stay recognisable next to its preserved git history.
