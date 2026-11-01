# 0009 — The Angular admin is upgraded, not rewritten

- Status: Accepted
- Date: 2026-11-01

## Context

The admin (`apps/admin`) was an Angular 12.1 app with TSLint, Karma and Protractor, webpack 4 (needing
`--openssl-legacy-provider`) and NgModules everywhere. It worked, and in the demo it is mostly read-only: catalog forms
render but only the super-admin can save; order lifecycle actions are the main interactive path. Rewriting it (in
Angular or React) would cost the most time for the least visible gain.

## Decision

Upgrade in place, one major at a time, using Angular's own tooling (PLAN.md Phase 8):

- `ng update` 12.1.1 → 22.2.4 (TypeScript 6.0.3), building after every major.
- TSLint → angular-eslint (legacy breaches start as warnings); Karma/Protractor → Vitest.
- Standalone components and the new control flow through the migration schematics, not by hand.
- Order and catalog services typed through `packages/api-client`; hide Cancel after shipping; read-only notice on
  catalog forms; an outbox view.

Hand-rewriting components and typing every legacy service were dropped for the demo (scope trim, 2026-10-31).

## Consequences

- **Tech:** the admin runs on current Angular with working lint and tests, but keeps legacy code: 29 NgModules
  (routing, lazy features, providers) and `strict: false`.
- **Business:** an internal tool for a closed store only needs to work and show the order lifecycle; upgrading shows
  how a real legacy app is modernised safely, at a fraction of a rewrite's cost.
