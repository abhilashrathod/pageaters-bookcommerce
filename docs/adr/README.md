# Architecture Decision Records

Short records of the significant decisions behind the Pageaters portfolio demo. Accepted ADRs are never edited;
a new ADR supersedes an old one.

| ADR                                                     | Title                                                    | Summary                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [0001](./0001-api-stays-javascript.md)                  | The API stays JavaScript                                 | `apps/api` stays CommonJS JavaScript; contracts come from shared zod schemas at runtime.    |
| [0002](./0002-catalogue-search-word-prefix-regex.md)    | Catalogue search is a word-prefix regex query            | Type-ahead search uses a word-prefix regex on MongoDB instead of lunr or Atlas Search.      |
| [0003](./0003-turborepo-monorepo.md)                    | One pnpm + Turborepo monorepo                            | Three legacy repos plus the CMS live in one pnpm/Turborepo workspace with shared packages.  |
| [0004](./0004-payload-cms-content-commerce-boundary.md) | Payload CMS owns content; the API owns commerce          | Payload holds pages, blocks and globals; prices, stock and orders stay in the API.          |
| [0005](./0005-next-app-router-tailwind-shadcn.md)       | Storefront rebuilt on App Router, Tailwind and shadcn/ui | The Pages Router + styled-components storefront is rebuilt rather than upgraded.            |
| [0006](./0006-serverless-api-and-adapters.md)           | Serverless-safe Express API with vendor adapters         | Express on Vercel Functions; every vendor sits behind a real/mock adapter, mock by default. |
| [0007](./0007-demo-mode-sandbox.md)                     | The public deployment is a demo-mode sandbox             | `DEMO_MODE` guards, demo accounts, test-mode payments, weekly cleanup, simple store rules.  |
| [0008](./0008-preserve-git-history.md)                  | Keep the original git history                            | Original history is kept; only the one-time 2026-10-27 scrubs rewrote it.                   |
| [0009](./0009-angular-admin-upgraded-not-rewritten.md)  | The Angular admin is upgraded, not rewritten             | Angular 12 → 22 via `ng update` and schematics instead of a rewrite.                        |
| [0010](./0010-migration-decision-log.md)                | Migration decision log                                   | The finished plan's decisions and known limitations; `PLAN.md` itself is in git history.    |
