# PLAN.md — Pageaters Monorepo Migration

Phased plan to turn three legacy repos into a production-grade, portfolio-ready Turborepo monorepo.
Rules for _how_ to work are in [`AGENTS.md`](./AGENTS.md). Tick boxes as steps complete.
This file is temporary: when every phase is done, archive the decision log into `docs/adr/` and delete this file.

---

## Decision log (agreed 2026-10-25 / 26)

| Topic                  | Decision                                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo               | Turborepo + pnpm, Node 22 LTS                                                                                                                                                                                                                                  |
| Hosting                | Everything on Vercel (storefront, admin, cms, api)                                                                                                                                                                                                             |
| Domains                | `demo.pageaters.com`, `admin.demo.`, `cms.demo.`, `api.demo.pageaters.com`. Root domain untouched                                                                                                                                                              |
| Storefront             | Migrate to Next.js **App Router**; UI moves to **Tailwind + shadcn/ui** (translate existing components)                                                                                                                                                        |
| Backend                | Migrate to **TypeScript**; layered architecture; serverless-safe                                                                                                                                                                                               |
| CMS                    | **Payload CMS 3** as `apps/cms`. Controls: Home + campaign pages (free-form), templates for Product, Collection, Category, Bundle, Book Box pages (locked core blocks + per-item overrides), Header, Nav, Footer, Announcement bar, Theme, SEO                 |
| Code-owned pages       | Cart, checkout, profile/account, auth                                                                                                                                                                                                                          |
| Git history            | **Keep** all three repos' history (Bitbucket → GitHub), scrubbed of secrets only                                                                                                                                                                               |
| License                | **All Rights Reserved** — review/showcase only; no reuse of code, brand or content                                                                                                                                                                             |
| Name                   | Keep **Pageaters** branding                                                                                                                                                                                                                                    |
| Database               | New MongoDB Atlas cluster (free tier) with fake/sanitised data. Old Vultr instance destroyed                                                                                                                                                                   |
| Seed data              | From `pageaters-data-dump` (books-only export: 669 books, 313 authors, 55 bundles, 14 collections, 12 categories, 23 product sets). Strip `wholeSalePriceHistory`; replace `inventory` with generated values                                                   |
| Images                 | Book covers from Open Library by ISBN (665/669); author photos from Open Library only on confident name match, else branded initials avatar; collections, bundles, categories and the 4 ISBN-less books get generated brand artwork. All stored on Vercel Blob |
| Payments               | Razorpay **test mode only**; boot guard rejects `rzp_live_` keys in demo                                                                                                                                                                                       |
| Email / SMS / Shipping | Mock adapters; in-app outbox                                                                                                                                                                                                                                   |
| Demo access            | Storefront: one-click demo shopper; cart/address/orders/search only. Admin: catalog read-only, order lifecycle actions allowed. CMS: read-only. No uploads anywhere. Nightly reset                                                                             |
| Credentials            | Razorpay, Twilio, Delhivery, SendGrid revoked/rotated by owner; AWS and Cloudinary accounts closed; Vultr DB destroyed                                                                                                                                         |

---

## Phase 0 — Pre-flight

- [x] Review uncommitted changes in `pageaters-store-react` (11 files: cart, checkout, orders, schemas, `_app.tsx`) and `pageaters-backend/config/production.js`; owner decides keep/discard; commit or discard in the **original** repos before import
  - Storefront: unreleased add-ons feature kept, committed and pushed to `main` (`dcd14c7`) → 139 commits. Backend: `config/production.js` change discarded (new `.env` files replace it). All `feature/*` branches ignored — import `main`/`master` only
- [x] Inventory every file in all three repos' history that ever held secrets (`config/*.js`, admin `src/environments/*.ts`, any `.env`), using gitleaks across full history
  - gitleaks 8.30.1 on default branches: backend 37 hits, storefront 3, admin 0. Secret files: backend `config/{default,production,staging}.js`, storefront `.env.local`, admin `src/environments/environment*.ts`. Inline in code: backend `src/helpers/order.helper.js` (Delhivery token), `src/routes/private.routes.js` (private route key), storefront `pages/_app.tsx` (Brevo client key). False positives: `data-key` attrs in email templates
- [x] Back up the three original repos (bundle files) before any history rewrite
  - `~/pageaters-backups/*-20261027.bundle` (all branches) + `SHA256SUMS`; restore-tested: commit counts match (admin 49, backend 149, storefront 142), fsck clean
- **Checkpoint:** report findings, confirm scrub list with owner
  - Approved 2026-10-27. **Delete from all history:** backend `config/{default,production,staging}.js`, storefront `.env.local`.
    **Replace value with `***REMOVED***` (keep file):** backend `src/helpers/order.helper.js` (Delhivery token),
    `src/routes/private.routes.js` (private key), storefront `pages/_app.tsx` (Brevo key), admin `src/environments/environment*.ts` (`CLIENT_ID`).
    Replacement list of literal values lives outside the repo and is deleted after Phase 1.
  - Amplitude and Brevo/Sendinblue are removed entirely (owner doesn't use them) — see Phase 1

## Phase 1 — Monorepo foundation & history

- [x] Rewrite each repo into its subdirectory with `git filter-repo --to-subdirectory-filter apps/<name>` and apply the approved Phase 0 scrub list to all commits
  - Done 2026-10-27 in `../.migration/{admin,api,storefront}` (fresh default-branch clones; originals untouched). 29 unique secret values replaced; empty commits kept. Verified: counts 49/137/139, authorship + dates identical, all paths under `apps/<name>`, zero scrubbed values in history, HEAD differs only in scrubbed lines. gitleaks: only 6 `data-key` false positives (api email templates) — allowlist them in `.gitleaks.toml`
- [x] Merge the three histories into one repo (`--allow-unrelated-histories`); verify commit counts (admin 49, backend 137, storefront 139; default branches only) and authorship preserved
  - Done 2026-10-27: empty root commit + three `--no-ff` import merges → 329 commits on `main`. Per-app counts and author/committer/date/message metadata verified identical
- [x] Run gitleaks on the merged full history — must be clean
  - Clean 2026-10-27 (all commits incl. merges). `.gitleaks.toml` extends default rules and allowlists only `data-key="…"` attributes in `apps/api/src/templates/email/*/*.ejs` (6 false positives, verified against a default-rules-only scan)
- [x] **Personal/business data scrub** (owner-approved one-time exception, 2026-10-27; force-pushed once with `--force-with-lease`)
  - Full-history sweep for emails, phone numbers, addresses, GST/PAN/bank details. Replaced in every commit: owner's personal email → `owner@example.com`; business contact emails → `support@demo.pageaters.com`; all real phone numbers → `9000000000`; supplier name/address, warehouse pickup name/street and the business street address in storefront footer/privacy policy → fake values (city and pincode kept). JVM crash log removed from history
  - `mainAddress` (Delhivery pickup) is now `PAGEATERS DEMO WAREHOUSE`, fake street and phone, real city/pincode — shipping flows keep working
  - Verified: 334 commits, authorship/dates/messages identical, zero old values in file contents, gitleaks clean. Commit-author emails intentionally untouched (authorship)
- [x] **Authorship fix** (owner-approved one-time exception, 2026-10-27; force-pushed once with `--force-with-lease`)
  - 17 commits made by the owner under a former employer's username (`ta61`) reassigned to the owner's own identity via `git filter-repo --mailmap`. Verified: 339 commits, identical tree, dates and messages; no other author changed
- [x] Initialise pnpm workspace + Turborepo (`turbo.json`: build, dev, lint, typecheck, test, test:e2e)
  - Root `package.json` (pnpm 12.4.1 pinned, Node 22, turbo 2.11.10), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`. App packages renamed `admin` / `api` / `storefront`. Verified with `turbo --dry` on Node 22. Missing legacy scripts (`dev`, `typecheck`…), `pnpm install`, lockfile and removal of per-app `package-lock.json` belong to the "Each app installs and runs" step
- [x] `packages/config` (tsconfig bases, ESLint flat config, Prettier, Tailwind preset), `.nvmrc`, `.editorconfig`, root `.gitignore`
  - TypeScript 6.0.3 (typescript-eslint doesn't support TS 7 yet), ESLint 9.39 (react-hooks plugin not on ESLint 10 yet), Prettier 3.9 (legacy style: single quotes, width 140), Tailwind 4.3 theme CSS with the original colours, Metropolis font, 1rem radius and 576/768/992/1200 breakpoints. Verified in a sandbox: all tsconfigs compile, ESLint presets catch planted `any`/`console`/floating-promise/`<img>` issues, Tailwind emits `bg-accent → var(--accent)`
- [x] Remove junk: `.idea/`, `.DS_Store`, `hs_err_pid*.log`, empty `admin.controller.js`, `modified/sqlite.js`, `data/db`, `queueData`, `info`, `bitbucket-pipelines.yml`, commented-out routes, unreachable code
  - Junk: crash log, `bitbucket-pipelines.yml`, `modified/sqlite.js`, `data/db`/`info`/`queueData` placeholders, `public/foo.json`, empty files, unused email template variants, boilerplate README (`.idea/`, `.DS_Store` were never tracked)
  - Dead api modules (static `require` trace from `index.js`): unmounted private/books/subscription/subscription-plan/page routes + controllers, unused models (apiClient, device, discount, log_pushNotification, page, store, subscriptionPlan), push-notification and static-file helpers, unrouted handlers, dev-only unauthenticated `POST /store-books/bulk/create` scraper, unused exports, imports, config keys and 13 npm deps
  - Commented-out code removed in api and admin. Storefront skipped (rebuilt in Phase 7). Kept: unmounted `apiLimiter`/`speedLimiter` (mounted in Phase 4)
- [ ] Legacy config reads from env: new committed `config/*.js` (backend) / `environment*.ts` (admin) with no values, plus `.env.example` listing **only the vars the running code needs** (no keys for removed or mocked services)
- [ ] Remove Amplitude and Brevo/Sendinblue entirely: ~~backend `@amplitude/node` dep, `AMPLITUDE` config, usage in `subscription.controller.js`~~ (done in junk-removal step); storefront Brevo script in `pages/_app.tsx`, `NEXT_PUBLIC_AMPLITUDE_API_KEY`, Amplitude mention in `pages/privacy-policy.tsx`
- [x] Husky + lint-staged + commitlint + gitleaks pre-commit
  - `pre-commit`: gitleaks on staged changes (fails if gitleaks is missing) → lint-staged (Prettier). Hooks call `node_modules/.bin` directly: `pnpm exec` auto-installs the whole workspace when a `package.json` changes. `commit-msg`: commitlint, Conventional Commits with a scope list. Legacy apps are in `.prettierignore` until migrated. Verified: bad messages/scopes and a staged fake key are rejected
  - pnpm 12 `minimumReleaseAge` guard kept on: typescript-eslint pinned to 8.72.0 instead of adding release-age exemptions. Root-only install (`pnpm --filter pageaters install`); full workspace install is the "Each app installs" step
- [x] LICENSE (All Rights Reserved) + notice in README
  - `LICENSE` (view-for-evaluation only; no copying, deployment, derivatives or ML training), interim root `README.md` with notice, every `package.json` set to `"license": "UNLICENSED"` (api previously declared ISC)
- [ ] Each app installs and runs (legacy code, pre-upgrade) under the workspace on Node 22
- [x] **Owner:** create an empty **private** repo on personal GitHub (no README, license or .gitignore)
  - `github.com/abhilashrathod/pageaters-bookcommerce` (private)
- [x] Push to that private GitHub repo
  - `main` pushed and kept in sync after each step since 2026-10-27
- **Checkpoint:** owner verifies history on GitHub; repo stays private until Phase 11

## Phase 2 — Seed data & images

- [ ] `seed/` pipeline: read dump → drop `wholeSalePriceHistory`, real `inventory`, deleted docs, internal fields → generate stock → write sanitised JSON
- [ ] Scan seed output for PII/sensitive data; flag anything found
- [ ] Covers: fetch Open Library covers by ISBN; record misses
- [ ] Author photos: Open Library match by name with confidence threshold; fallback branded initials avatar
- [ ] Generate brand artwork for collections, bundles, categories and ISBN-less books
- [ ] Upload images to Vercel Blob; write image manifest; rewrite seed image fields to Blob URLs
- [ ] Demo accounts: demo shopper, demo admin (read-only catalog role), CMS read-only user
- [ ] **Owner:** in Atlas, create a DB user for the demo, allow network access `0.0.0.0/0` (Vercel has no fixed IPs on free tiers), put the connection strings for databases `pageaters_api` and `pageaters_cms` into local `.env`
- [ ] `pnpm seed` (idempotent) against Atlas
- **Checkpoint:** owner spot-checks catalog data and images

## Phase 3 — Shared contracts

- [ ] `packages/shared`: domain types + zod schemas, merging the 16 duplicated schema files from admin and storefront and backend `constants/enums.js` / Joi validators
- [ ] `packages/api-client`: typed client (fetch-based, works in RSC and Angular)

## Phase 4 — API: TypeScript, architecture, security

- [ ] Convert to TypeScript (ESM, strict); upgrade Express, Mongoose 8, remaining deps
- [ ] `env.ts` with zod; replace `config/*.js`; `.env.example`
- [ ] Split `app.ts` (app setup) from server start; remove seed-on-boot and in-process cron
- [ ] Layering: routes → controllers → services → models. Split `order.controller` (1,609 lines), `auth` (738), `cart` (570), `storeBook` (411) into services
- [ ] Replace Joi with shared zod schemas + `validate()` middleware
- [ ] Adapters: payments (Razorpay + mock), sms, email, shipping (Delhivery + mock), storage (Vercel Blob)
- [ ] Security fixes: single CORS allowlist (remove reflect-any-origin), mount rate limiters, per-route body limits (drop global 100 MB + `multer().any()`), protect `/re-index`, auth audit on every route
- [ ] Replace lunr in-memory index with MongoDB text index / Atlas Search; replace sqlite mail queue with direct sends via adapter
- [ ] Central error handler, pino logging, request IDs, `/health`
- [ ] Fix legacy bugs found in Phase 1 cleanup: `add-on.controller` `update` (undefined `id`/`addOnId`) and `getById` (returns undefined `bundles`), `getByProductId` ignores `productId`; `jobs/index.js` undefined `logError`; `STOCK_ALERT` email has only `en.html` but renderer loads `en.ejs`
- [ ] OpenAPI from zod at `/docs`
- [ ] Remove `page.controller` / page & banner models (moved to CMS); move sitemap + Google product feed to storefront
- **Checkpoint:** API runs locally, all routes reachable, typecheck clean

## Phase 5 — Demo mode

- [ ] `DEMO_MODE` flag; server-side write guards per AGENTS.md §6
- [ ] Demo shopper one-click login (no signup/OTP)
- [ ] Admin catalog read-only; order lifecycle via mock shipping allowed
- [ ] `rzp_live_` boot guard; Razorpay test-mode checkout
- [ ] Mock email/SMS → outbox collection + outbox view
- [ ] Uploads disabled; rate limits on public endpoints
- [ ] Protected reset endpoint + nightly Vercel Cron
- [ ] Tests for every guard

## Phase 6 — CMS (Payload)

- [ ] `apps/cms` scaffold: Payload 3, MongoDB adapter (separate DB), Vercel Blob storage adapter
- [ ] Collections: Pages, Templates (Product, Collection, Category, Bundle, Book Box), Overrides, Media, Users (roles: admin, demo-readonly)
- [ ] Globals: Header, Navigation, Footer, Announcement Bar, Theme tokens, SEO defaults
- [ ] Block configs mirroring existing components: Hero/GiantSquare/Landscape/PreOrder/FullBleed banners, Product Set row, Featured Books, Collections/Bundles/Categories/Deals carousels, Featured Category, Featured Deals, Authors, Rich text, Spacer; plus template core blocks (product info + buy box, collection header + grid, etc.) marked locked
- [ ] Custom fields that pick commerce records from the API (product sets, collections, categories)
- [ ] Drafts, versions, scheduled publish, live preview
- [ ] `afterChange` hooks → storefront revalidation webhook
- [ ] `packages/cms-types` generation wired into Turbo
- [ ] Seed initial CMS content recreating the original homepage and page layouts
- **Checkpoint:** owner edits a page in CMS and sees it locally

## Phase 7 — Storefront rebuild (App Router + Tailwind/shadcn)

- [ ] New Next.js App Router app; Tailwind + shadcn/ui; theme tokens from CMS as CSS variables
- [ ] Translate existing components (banners, cards, carousels, elements, partials) to Tailwind/shadcn, preserving the original look
- [ ] Block registry + safe renderer + per-block Suspense
- [ ] Routes: `/` and `[...slug]` (CMS pages), `/books/[id]`, `/collections/[id]`, `/categories/[id]`, `/bundles/[id]`, `/book-boxes` (templates + overrides)
- [ ] Code-owned: cart, checkout (Razorpay test), account/orders, address select, demo login
- [ ] Header/nav/footer/announcement from CMS globals
- [ ] Caching with tags + revalidation route; draft mode for CMS preview
- [ ] SEO: metadata API, sitemap, robots (noindex for demo), product feed
- [ ] Demo banner; remove GA production IDs
- **Checkpoint:** visual comparison with original store

## Phase 8 — Admin upgrade (Angular)

- [ ] Stepwise `ng update` from 12 to latest stable, one major at a time, building after each
- [ ] Fix devkit/CLI mismatch; TSLint → angular-eslint; remove Protractor; Karma → Jest/Vitest
- [ ] Standalone components, new control flow; typed services via `packages/api-client`
- [ ] Demo-mode UX: read-only notices on catalog forms; outbox view
- **Checkpoint:** every admin route renders against the new API

## Phase 9 — Tests

- [ ] API: Vitest + supertest + mongodb-memory-server — cart totals, discounts, order pricing, order lifecycle, auth, demo guards
- [ ] Storefront: component tests for cart and block renderer
- [ ] Admin: service + key component tests
- [ ] Playwright E2E: browse → add to cart → checkout (Razorpay test) → order visible in admin → ship → delivered

## Phase 10 — CI/CD & deployment

- [ ] GitHub Actions: lint, typecheck, test, build via Turbo (affected only), Vercel Remote Cache, gitleaks, CodeQL
- [ ] Renovate
- [ ] Vercel projects ×4 with root directories, `turbo-ignore`, preview deploys per PR
- [ ] Environment variables per project (test-mode Razorpay, Atlas, Blob, CMS secret, `DEMO_MODE=true`)
- [ ] Vercel Cron: nightly reset
- [ ] DNS for the four `*.demo.pageaters.com` hosts
- [ ] Multi-stage Dockerfile for API (`turbo prune`) as alternate target
- **Checkpoint:** all four apps live, E2E passing against production demo

## Phase 11 — Documentation & launch

- [ ] Root README: story (real business, ~10k customers, hand-built 2022–24, re-architected 2026), Mermaid architecture diagram, live links, demo logins, screenshots, 3-command local setup
- [ ] `docs/*.md` per AGENTS.md §9
- [ ] ADRs: monorepo, Payload CMS & content/commerce boundary, App Router + Tailwind/shadcn, serverless API & adapters, demo-mode sandbox, history preservation
- [ ] `agents/*.md` subagents — final review of the roster. Added early (2026-10-27, workflow in AGENTS.md §10): `api-engineer`, `storefront-engineer`, `admin-engineer`, `code-reviewer`, `security-auditor`, `docs-writer`, `test-writer`, `lint-fixer`, `deploy-engineer`. Still to add in their phases: `cms-engineer` (Phase 6)
- [ ] Final gitleaks + manual sensitive-data sweep
- [ ] Make GitHub repo public
- [ ] Archive decision log to `docs/adr/`, delete PLAN.md
