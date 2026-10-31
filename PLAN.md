# PLAN.md — Pageaters Monorepo Migration

Phased plan to turn three legacy repos into a production-grade, portfolio-ready Turborepo monorepo.
Rules for _how_ to work are in [`AGENTS.md`](./AGENTS.md). Tick boxes as steps complete.
This file is temporary: when every phase is done, archive the decision log into `docs/adr/` and delete this file.

---

## Decision log (agreed 2026-10-25 / 26)

| Topic                  | Decision                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo               | Turborepo + pnpm, Node 22 LTS                                                                                                                                                                                                                                                                                                                                      |
| Hosting                | Everything on Vercel (storefront, admin, cms, api)                                                                                                                                                                                                                                                                                                                 |
| Domains                | `demo.pageaters.com`, `admin.demo.`, `cms.demo.`, `api.demo.pageaters.com`. Root domain untouched                                                                                                                                                                                                                                                                  |
| Storefront             | Migrate to Next.js **App Router**; UI moves to **Tailwind + shadcn/ui** (translate existing components)                                                                                                                                                                                                                                                            |
| Backend                | Stays **JavaScript** (CommonJS; ADR 0001), validated with the shared zod schemas; layered architecture; serverless-safe                                                                                                                                                                                                                                            |
| CMS                    | **Payload CMS 3** as `apps/cms`. Controls: Home + campaign pages (free-form), templates for Product, Collection, Category, Bundle, Book Box pages (locked core blocks + per-item overrides), Header, Nav, Footer, Announcement bar, Theme, SEO                                                                                                                     |
| Code-owned pages       | Cart, checkout, profile/account, auth                                                                                                                                                                                                                                                                                                                              |
| Git history            | **Keep** all three repos' history (Bitbucket → GitHub), scrubbed of secrets only                                                                                                                                                                                                                                                                                   |
| License                | **All Rights Reserved** — review/showcase only; no reuse of code, brand or content                                                                                                                                                                                                                                                                                 |
| Name                   | Keep **Pageaters** branding                                                                                                                                                                                                                                                                                                                                        |
| Database               | New MongoDB Atlas cluster (free tier) with fake/sanitised data. Old Vultr instance destroyed                                                                                                                                                                                                                                                                       |
| Seed data              | From `pageaters-data-dump` (books-only export: 669 books, 313 authors, 55 bundles, 14 collections, 12 categories, 23 product sets). Strip `wholeSalePriceHistory`; replace `inventory` with generated values. Local dev only, never committed                                                                                                                      |
| Images                 | Book covers from Open Library by ISBN (515/618); author photos from Open Library only on confident name match, else branded initials avatar; collections, bundles, categories and the 4 ISBN-less books get generated brand artwork. All stored on Vercel Blob                                                                                                     |
| Payments               | Razorpay **test mode only**; boot guard rejects `rzp_live_` keys in demo                                                                                                                                                                                                                                                                                           |
| Email / SMS / Shipping | Mock adapters; in-app outbox                                                                                                                                                                                                                                                                                                                                       |
| Demo access            | Storefront: one-click demo shopper; cart/address/orders/search only. Admin: catalog read-only, order lifecycle actions allowed. CMS: read-only. Uploads: super-admin only. Seeded once; weekly visitor cleanup                                                                                                                                                     |
| Credentials            | Razorpay, Twilio, Delhivery, SendGrid revoked/rotated by owner; AWS and Cloudinary accounts closed; Vultr DB destroyed                                                                                                                                                                                                                                             |
| Demo scope             | (2026-10-30) A portfolio demo, not an enterprise product: the goal is to show skills, architecture and design thinking. Build the basic, mostly positive paths well; fix minor things; don't chase rare races or failure cases or build machinery for them (note them as known limitations). One combined review per batch, once its code is settled for the phase |
| Store rules            | (2026-10-30) Store credit is a coupon: spent once applied, never returned on cancel or refund. No cancel after shipping. Public lists max 50 items; admin/internal up to 1000                                                                                                                                                                                      |

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
- [x] Legacy config reads from env: `.env.example` per app listing **only the vars the running code needs** (no keys for removed or mocked services)
  - Done 2026-10-27 with subagents (api, admin, storefront in parallel; code-reviewer + security-auditor before merge)
  - api: `appConfig.js` reads `process.env` directly (no `config/*.js`; zod `env.ts` replaces it in Phase 4), same exported shape. Scripts load `.env` via `node --env-file-if-exists`; `config`/`cross-env` removed. `.env.example`: 21 vars. Boot needs `MONGODB_URI`, `RAZORPAY_KEY_ID` and a valid `TWILIO_*` pair (SDKs construct at import) until the Phase 4 adapters/mocks. `APP_ENV=production` sends real SMS/email — never on the demo. S3 vars are `S3_*` (Vercel reserves `AWS_*`). DB URI no longer logged
  - admin: no runtime env; `CLIENT_ID` and `X-CLIENT-ID` header removed (API no longer checks them); staging env/config/script removed; prod API → `api.demo.pageaters.com`
  - storefront: `.env.example` with the 5 `NEXT_PUBLIC_*` vars it reads (copy to `.env.local`)
  - Follow-ups found: per-app npm `package-lock.json` files and the stale api `Dockerfile`/`docker-compose.yml` (Node 12) → "Each app installs" step; hard-coded GA and Facebook Pixel IDs and a Brevo client key in storefront `_app.tsx`/`core/_analytics.ts` → Amplitude/Brevo removal step and Phase 7; hard-coded legacy S3 bucket names in api `constants/enums.js` → Phase 4 storage adapter
- [x] Remove Amplitude and Brevo/Sendinblue entirely: ~~backend `@amplitude/node` dep, `AMPLITUDE` config, usage in `subscription.controller.js`~~ (done in junk-removal step); storefront Brevo script in `pages/_app.tsx`, `NEXT_PUBLIC_AMPLITUDE_API_KEY`, Amplitude mention in `pages/privacy-policy.tsx`
  - Done 2026-10-27 (storefront-engineer): Brevo tracker and Facebook Pixel removed from `_app.tsx`; privacy policy now names only Google Analytics and cookies. No Amplitude/Brevo/Pixel code left anywhere. Owner decisions: remove the Facebook Pixel too, **keep Google Analytics**, no history scrub for these IDs
- [x] Husky + lint-staged + commitlint + gitleaks pre-commit
  - `pre-commit`: gitleaks on staged changes (fails if gitleaks is missing) → lint-staged (Prettier). Hooks call `node_modules/.bin` directly: `pnpm exec` auto-installs the whole workspace when a `package.json` changes. `commit-msg`: commitlint, Conventional Commits with a scope list. Legacy apps are in `.prettierignore` until migrated. Verified: bad messages/scopes and a staged fake key are rejected
  - pnpm 12 `minimumReleaseAge` guard kept on: typescript-eslint pinned to 8.72.0 instead of adding release-age exemptions. Root-only install (`pnpm --filter pageaters install`); full workspace install is the "Each app installs" step
- [x] LICENSE (All Rights Reserved) + notice in README
  - `LICENSE` (view-for-evaluation only; no copying, deployment, derivatives or ML training), interim root `README.md` with notice, every `package.json` set to `"license": "UNLICENSED"` (api previously declared ISC)
- [x] Each app installs and runs (legacy code, pre-upgrade) under the workspace on Node 22
  - Done 2026-10-27 (api/admin/storefront engineers in parallel, reviewed + audited). Per-app npm lockfiles removed; one `pnpm-lock.yaml`; unneeded install scripts denied in `pnpm-workspace.yaml` (`allowBuilds`). Verified together on Node 22.23: API boots against Atlas `pageaters_api` and serves catalog GETs; storefront `build` (needs the API up for `getStaticPaths`) and `start` serve 200; admin `build:prod` passes and `dev` serves 200
  - Fresh resolution drifted from the old npm locks, so a few deps are pinned to their legacy versions until the upgrade phases: api `mongoose-paginate-v2` 1.7.1 (newer breaks on mongoose 5); admin `typescript` 4.2.3, `@angular/compiler-cli` 12.1.1, `@types/lodash`; storefront `@types/styled-components`, `@types/lodash`
  - Stopgaps: admin `ng` runs with `--openssl-legacy-provider` (webpack 4 md4), removed in Phase 8; api scripts pass `--disable-warning=DEP0170` because Node 22 prints the full DB URI in that warning (mongodb 3.x driver), removed in Phase 4. Stale api Docker files deleted
  - Known red gates until their phases: admin `lint` (TSLint, 114 legacy errors) and `test` (Karma, no specs) exit 1 → Phase 8; storefront `lint` passes with 18 warnings; api has no gates yet → Phase 4
  - Follow-up (Phase 7): storefront copy/metadata still names the root domain `pageaters.com` (`core/_variables.ts`, `_app.tsx` og:site_name, `pages/index.tsx`, privacy policy, terms)
- [x] **Owner:** create an empty **private** repo on personal GitHub (no README, license or .gitignore)
  - `github.com/abhilashrathod/pageaters-bookcommerce` (private)
- [x] Push to that private GitHub repo
  - `main` pushed and kept in sync after each step since 2026-10-27
- **Checkpoint:** owner verifies history on GitHub; repo stays private until Phase 11

## Phase 2 — Seed data & images

- [x] `seed/` pipeline: read dump → drop `wholeSalePriceHistory`, real `inventory`, deleted docs, internal fields → generate stock → write sanitised JSON
  - Done 2026-10-27: `@pageaters/seed` workspace (`pnpm --filter @pageaters/seed sanitise`, Node 22 type stripping, no runtime deps). Per-collection field allowlists mirror the API models, nested keys included; unreviewed fields are dropped and fail the run. Soft-deleted docs dropped (309 authors, 52 bundles, 12 categories, 11 collections, 23 product sets incl. 14 inactive, 618 books); 181 refs to removed docs pruned per target collection. Stock generated from the doc ID only (reruns byte-identical): ~5% of books out of stock, the rest 1–1000 (owner, 2026-10-28: seeded once, never reset; out-of-stock items shown on purpose). Category `numberOfBooks` recounted, legacy `meta.url` cleared, `EN` → `English`, stray `deletedAt` cleared on kept docs (owner: one author marked deleted by mistake stays). Reviewed + audited
  - `seed/data/` is local dev data only: gitignored, never committed or deployed (owner decision 2026-10-27). Free text to scan next: author `intro` (has external links), book/bundle/collection `description`, `tagline`, `message`, category `meta`
- [x] Scan seed output for PII/sensitive data; flag anything found
  - Done 2026-10-27: `src/scan.ts` runs inside every `sanitise`, before anything is written (masked output; a flagged value or a changed reviewed count fails the run and leaves `seed/data` untouched). Detectors: emails, UPI IDs, mobile/landline/toll-free numbers in any grouping, Aadhaar/card/bank-account digit runs, GSTIN/PAN/IFSC, old-store domains and handles, links, social handles, business terms; ID/ISBN fields skipped only when they have the expected shape. Result: none of those found; the dump holds no customer data. Reviewed and accepted (pinned by count): 17 author websites and 24 social handles in author `intro` (publisher bio copy), 3 words in book blurbs (`vendor`, `supplier`, `call us`; plot text). False positives handled in the scanner: ISBNs, birth–death years, upload timestamps in image names. `popularity` is the old storefront view count per item (owner, 2026-10-27): kept, it drives sort-by-popularity and isn't sales data. Code-reviewed and audited (the audit's independent sweep was clean too)
  - Notes for later steps: ISBNs are messy (stray whitespace, invisible LRM marks, `n/a`, one field with three ISBNs, one ISBN typed into `dimensions`) → clean in the covers step; 10 author `avatar` values are truncated base64 fragments → author-photo step; some `message` texts carry 2023 release dates
- [x] Covers: fetch Open Library covers by ISBN; record misses
  - Done 2026-10-28: `pnpm --filter @pageaters/seed covers` (~10 min, needs network). Always anchored on the ISBN: the exact edition's cover (Books API, 50 ISBNs a request), else the work's cover (search by ISBN, one a second). A cover is used only when Open Library's title matches ours or the exact title was reviewed (`acceptedTitleMismatches`, 7). Retries with backoff; a failed lookup keeps the old file; a sharp drop in covers deletes nothing. Output (gitignored): `seed/data/images/covers/<bookId>-<coverId>.jpg`, `covers.json`, `cover-misses.json`. ISBNs now cleaned in `sanitise` (digits only, first of several). Reviewed + audited
  - Result: **515/618** (395 edition, 120 work). 103 misses: 67 not in Open Library, 25 no cover, 4 wrong book or foreign edition (Heartstopper Vol 3, Yours Truly, Where Mayflies Live Forever, Kafka on the Shore), 6 no ISBN, 1 broken ISBN. How misses are covered is an owner decision (generated artwork in the artwork step, or a second cover source)
- [x] Author photos: Open Library match by name with confidence threshold; fallback branded initials avatar
  - Done 2026-10-28: `pnpm --filter @pageaters/seed authors` (~10 min, needs network). Confidence = anchored on the author's own books: Open Library lists them on the edition of one of their ISBNs with the same surname and first initial (147), or a search finds exactly our name with a best-known work among our titles (10; plain name search returns homonyms). Initials avatar (SVG, accent `#ff5f25`, white initials) for everyone else. Shared plumbing moved to `src/openlibrary.ts` (covers use it too). Output (gitignored): `seed/data/images/authors/`, `author-images.json`. Reviewed + audited
  - Result: **157/309 photos**, 152 initials (116 matched but Open Library has no photo, 36 no confident match). Looser surname + initial matches checked by hand: Robin Sharma, Viktor E Frankl, S.A. Chakraborty, Hafsah Faizal (our data spells it "Hufsa"). Photos can be replaced later via super-admin uploads. Owner, 2026-10-28: photos are fine on the public demo (public data, non-commercial)
- [x] Generate brand artwork for collections, bundles, categories and every book without a usable cover (103 after the covers step): a book illustration in accent `#ff5f25` and primary `#222222` (owner, 2026-10-28; real covers can be uploaded later via admin)
  - Done 2026-10-28: `pnpm --filter @pageaters/seed artwork` (offline, deterministic SVG). **178 pieces**: 103 book covers (600×900; accent cover + dark spine or the reverse, title, series note as a subtitle, author), 52 bundles (1000×1000 stack of books + "N BOOKS"), 11 collections (1200×900 shelf of spines), 12 categories (1000×1000 open book). Brand colours and two accent tints only; text centred for cropped cards. Output (gitignored): `seed/data/images/artwork/<kind>/`, `artwork.json`. SVG text uses the Metropolis stack and falls back to system sans-serif where Metropolis isn't installed. Reviewed + audited
- [x] Upload images to Vercel Blob; write image manifest; rewrite seed image fields to Blob URLs
  - Done 2026-10-28: `pnpm --filter @pageaters/seed upload` (token from `apps/api/.env`, documented in its `.env.example`; the Phase 4 storage adapter uses the same token). **1002 images, 33 MB**: 618 books (515 covers + 103 artwork), 309 authors (157 photos + 152 initials), 52 bundles, 11 collections, 12 categories. Public, `cache-control: max-age=31536000`; content-hashed paths under `catalog/`, so reruns upload nothing (verified: 0 uploaded, 1002 unchanged) and a changed image gets a new URL. Manifest: `seed/data/image-manifest.json` (gitignored). Fails rather than leave a document without an image
  - Owner, 2026-10-28: artwork and initials avatars are PNG, rendered with Metropolis embedded (`@fontsource/metropolis` + `@resvg/resvg-js`; resvg ignores in-memory fonts, so they are unpacked to `seed/data/fonts/` and loaded as files; a test fails if text falls back to a system font)
  - Image fields now hold full URLs; the legacy storefront and admin build image URLs from file names, so they show broken images until Phases 7–8 (or until pointed at full URLs). Reviewed + audited
- [x] Demo accounts: demo shopper, demo admin (read-only catalog role), super-admin (owner; password from local `.env`, never committed). CMS read-only user moved to Phase 6 (Payload doesn't exist yet)
  - Done 2026-10-28: `seed/src/accounts.ts`, built when the seed is loaded (step 9), never written to `seed/data`. Demo shopper (`USER`, `shopper@demo.pageaters.com`, phone `9000000000`, one fictional Bengaluru address, an empty cart and favourites as signup creates), demo admin (`ADMIN`, `admin@demo.pageaters.com`) and super-admin (`ADMIN`, from `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` in `apps/api/.env`). Fixed IDs so re-seeding updates the same documents; passwords hashed like the API (HMAC-SHA512, random salt); demo accounts get random passwords nobody uses (one-click login in Phase 5). The API only has `USER`/`ADMIN` until Phase 5, so the demo admin has full admin rights until then (nothing is deployed before Phase 10). `pnpm --filter @pageaters/seed accounts` checks the owner settings without printing them. Reviewed + audited
- [x] **Owner:** in Atlas, create a DB user for the demo, allow network access `0.0.0.0/0` (Vercel has no fixed IPs on free tiers), put the connection strings for databases `pageaters_api` and `pageaters_cms` into local `.env`
  - 2026-10-28: DB user and `0.0.0.0/0` done; `MONGODB_URI` verified (connects, read/write, database `pageaters_api`). `MONGODB_URI_CMS` fixed to `/pageaters_cms` and verified (connects, read/write). Advisory: the user has `readWriteAnyDatabase`; `readWrite` on the two databases is enough
- [x] `pnpm seed` (idempotent) against Atlas
  - Done 2026-10-28: `pnpm seed` (root) → `seed/src/load-cli.ts`, `--dry-run` previews. Refuses unless the database is `pageaters_api` and every image field is a Vercel Blob URL. Default run only inserts missing documents (later super-admin edits survive, nothing is deleted); `--sync` makes the catalog match the seed exactly. Accounts: credentials follow `.env` every run; shopper address/cart/favourites only created when missing. Loaded: 618 books, 309 authors, 52 bundles, 12 categories, 11 collections, 23 product sets, 3 users, 1 address, 1 cart, 1 favourites; rerun inserted 0. Verified through the running API: book list 616 (+2 book boxes) with Blob posters, categories 12, category products 177, super-admin login 200. Reviewed + audited
- **Checkpoint:** owner spot-checks catalog data and images

## Phase 3 — Shared contracts

- [x] `packages/shared`: domain types + zod schemas, merging the 16 duplicated schema files from admin and storefront and backend `constants/enums.js` / Joi validators
  - Split (owner-approved 2026-10-28). Source of truth for each field: the Mongoose model and the seed allowlists; frontend types are checked against them, never copied blindly. Types come from `z.infer`, never written by hand. Order: 1a+1b in one branch, then 1c, 1d, 1e in parallel worktrees; the orchestrator owns the package's `src/index.ts` and adds the populated cart/order variants at merge
  - [x] 1a. Scaffold `@pageaters/shared`: TypeScript strict, ESM, zod, `exports` map, `build`/`typecheck`/`lint`/`test` wired into turbo. Must import cleanly from Node 22 (the seed, and the API after Phase 4), Next.js and Angular. Shared primitives here too (`objectId`, money, image URL, pagination query and page envelope) so parallel steps don't redefine them
  - [x] 1b. Enums and constants from `constants/enums.js`: domain values only (roles, statuses, order/payment states, discount and address types…). Infrastructure values (cookie names, S3 buckets, file modules) stay in the API
    - 1a+1b done 2026-10-28 (api-engineer, reviewed + audited): `@pageaters/shared` with zod 4.6.7, NodeNext + `.ts` specifiers rewritten to `.js` in `dist/`; tests run on sources via Node type stripping, plus one that imports the built package in plain Node. Primitives: `objectIdSchema`, `isoDateSchema` (string), `moneySchema` (rupees, up to 2 decimals — seed has paise in member/rent prices), `imageUrlSchema` (https), `paginationQuerySchema` (page 1, limit 10, max 1000, `sortBy` createdAt, `sortOrder` asc/desc/1/-1 → 1/-1), `paginated()`, `apiResponse()`, `apiErrorResponseSchema`. 11 enums (roles, user status, address type, product type, book version, reading level, availability, order status, order request type/status, payment method); key `NET_BAKING` → `NET_BANKING`, value unchanged. Left out as unused anywhere: sources, discount/order/payment-stage/subscription/notification enums. A test checks enum values against `enums.js` until Phase 4 removes it
    - Root gates 2026-10-28: lint/typecheck/test/build pass for shared, seed, storefront (build needs the API running on :5005 and `NEXT_PUBLIC_BASE_PATH` set), admin build; known red: admin `lint`, and admin `test` never exits (Karma watch mode opens Chrome) → run root `test` with `--filter='!admin'` until Phase 8
  - [x] 1c. Catalog entities: book, author, category, collection, bundle, product set, add-on, mystery box, deal, meta, plus response envelopes. No `wholeSalePriceHistory`. Test: every document in `seed/data` parses (skipped when `seed/data` is absent, e.g. in CI)
  - [x] 1d. Customer and commerce entities: user (public shape, no password/salt), address, cart, favourites, order, store credit / credit transactions, gift card, subscriber, stock alert. Product references as IDs; populated variants added at merge
  - [x] 1e. Request payload schemas replacing the Joi validators (auth, cart, address, favourites, order, subscriber, common), keeping their error codes (`REQUIRED_QUANTITY`…) so the Phase 4 swap doesn't change API behaviour
    - 1c–1e done 2026-10-28 (three api-engineers in parallel worktrees, each reviewed + audited, then merged together):
      - 1c `src/catalog/`: references layered (`fooFieldsSchema` → `fooRefSchema` id-or-projection → `fooSchema`) because recursive schemas emitted `any` in the `.d.ts`; covers the deepest populate (deal → set → book → author). List items are `.pick()`s of each controller's `select`; product-set detail has its own flattened shape. Links (`deal.ctaLink`, `meta.url`) accept only a site path or https. All 1025 seed documents parse. `book.model.js` is dead (only `storeBook` is live)
      - 1d `src/commerce/`: `userSchema` is the public profile (credentials stripped, tested); order `payment` is the per-method summary only — the raw Razorpay entity is rejected; `''` order status rejected; response picks for `GET /favorites` and `GET /orders/list`
      - 1e `src/requests/`: 24 Joi validators → `*PayloadSchema`, same error codes, strict unknown keys; a parity test runs the real Joi over the same inputs (skips once the validators are gone). Joi 14 number conversion ported linear-time (the first port had a quadratic ReDoS, caught in audit). Deliberate gaps: password value not trimmed (API hashes the raw value), quoted/IP-literal emails rejected
      - At merge: `src/populated.ts` (cart, customer order, order list, favourites with references populated per each controller's `select`), barrel wiring, README
  - Banner and page types are not ported (they move to the CMS in Phase 6). No app imports `@pageaters/shared` yet: the API switches over in Phase 4, the storefront in Phase 7, the admin in Phase 8

- [x] `packages/api-client`: typed client (fetch-based, works in RSC and Angular)
  - Split (owner-approved 2026-10-28): 2a first, then 2b and 2c in parallel worktrees. Responses are typed from `@pageaters/shared`; runtime zod parsing is off by default and opt-in per call or per client (the legacy API breaks some target contracts until Phase 4). Targets the API's 145 routes as they exist today; Phase 4 updates the client where routes change
  - [x] 2a. Core `@pageaters/api-client`: fetch wrapper (base URL, cookies/credentials in the browser, forwarded cookies on the Next server, Next cache tags/revalidate passed through without importing Next, timeout/abort), envelope unwrapping, typed `ApiError` carrying the API's error code, query serialisation, a declarative endpoint definition used by 2b/2c, one sample resource (categories) proving the pattern. Promise-based, no DOM- or Node-only APIs, so Angular can wrap it in `from()`. Tests with a mocked fetch
    - Done 2026-10-28 (api-engineer, reviewed + audited). `createApiClient({ baseUrl, headers, validate, timeoutMs, onUnauthorized })`; `defineEndpoint({ method, path, query | body, response })` with one flat call argument (the API merges params, query and body); shopper resources at the top level (`client.categories`), admin under `client.admin`. Cookie auth only (no refresh flow exists; `_RID` is unused): browser `credentials: 'include'`, Next server forwards cookies through an async `headers` function. One `ApiError` (`isApiError` guard) with the API's `status` key as `code`, `CLIENT_*` codes for network/timeout/abort/bad response/validation. Every URL is checked to stay on the base origin and path; `.`/`..`/empty path params rejected; `redirect: 'error'`; no abort signal unless needed, so Next de-dups requests. Calls from the Next server lose the API's `Set-Cookie` (auth and cart writes go from the browser or a route handler)
  - [x] 2b. Shopper and public endpoints (84 routes): catalog reads, auth, cart, favourites, addresses, customer orders, store credit, subscribers, stock alerts
    - Done 2026-10-28 (api-engineer, reviewed + audited): 78 endpoints at the client's top level; 6 routes left out on purpose (health ping, `public/contactUs`, `store-books/bulk/export`, `orders/create-shipment` → admin, two Razorpay webhooks), listed in `endpoints/shopper/index.ts`. Missing response shapes in `@pageaters/shared` `responses/shopper/`, built from the entity schemas. Live read-only check against the Atlas demo data passed for every catalog list, detail and search (616 books, 309 authors, 52 bundles…); callers must send `page` until Phase 4 adds list defaults
  - [x] 2c. Admin endpoints (61 routes): catalog create/update/delete, order lifecycle, users, stock alerts, store credit issue. Write payloads without a shared request schema are typed locally and listed for Phase 4
    - Done 2026-10-28 (api-engineer, reviewed + audited): all 61 admin routes under `client.admin` (incl. `orders.createShipment`), except `PUT /users/:id` (a no-op that returns an arbitrary user); upload through `fileUploadForm`/`fileUploadRequest` + `client.request`. Admin payloads in `@pageaters/shared` `requests/admin/` (types-first, never `wholeSalePriceHistory`; every update key required because the legacy `$set` writes omitted fields as null; images required on create); admin responses in `responses/admin/`. The contract deliberately differs from today's API where the API leaks: users via `userSchema`, payment as the summary

## Phase 4 — API: architecture, upgrades, security

- [x] Upgrade dependencies: Express 5, Mongoose 8 (+ both paginate plugins; replace `remove`/`count`/`update` and
      callbacks), jsonwebtoken, helmet, express-rate-limit + express-slow-down, multer, axios, cookie-parser, compression,
      Razorpay, Twilio, SendGrid; drop `body-parser`, `colors`, `mkdirp`, `random-base64-string` where Node/Express cover
      them. Not upgraded (removed by later steps): lunr, better-queue, cron, node-cron, aws-sdk. Add `lint` (ESLint, JS
      config from `@pageaters/config`) and `test` (`node --test`) scripts with a boot smoke test. Regression check: boot
      against the Atlas demo data and rerun the api-client live read-only check from Phase 3
  - 2026-10-28: the API stays JavaScript (CommonJS) — owner decision, ADR 0001. The TypeScript conversion was dropped
    to avoid churn; CommonJS loads the ESM `@pageaters/shared` with `require()` on Node 22
  - Done 2026-10-28 (api-engineer, reviewed + audited): express 5.3.0, mongoose 8.24.7, mongoose-paginate-v2 1.9.5,
    jsonwebtoken 9.0.3, helmet 8.3.0, express-rate-limit 8.7.1, express-slow-down 3.1.1, multer 2.5.0, axios 1.21.0,
    twilio 6.2.0, @sendgrid/mail 8.1.6; the rest pinned as resolved. Removed body-parser, colors, mkdirp,
    random-base64-string and the unused node-cron; DEP0170 flag gone (the Mongoose 8 driver doesn't print the URI).
    `src/helpers/mongooseCompat.helper.js` keeps three Mongoose 5 behaviours the legacy callers rely on — sort strings
    (`'-1'`, `'DESC'`, missing → asc), `strictPopulate` off (deal `getById`), paginate `limit: undefined` → 0 — delete
    it when the legacy-bugs step fixes those callers. Forced behaviour changes: updates now skip `undefined` keys
    instead of writing null; async errors reach Express's default 500 page (shows a stack trace unless
    `APP_ENV=production`) instead of crashing; helmet 8 default headers (CORP `same-origin`, stricter CSP). Gates:
    `lint` (0 errors, 66 legacy warnings) and `test` (`node --test`: boot smoke test without a database + compat
    unit tests). Regression check: ~40 read-only GETs against the Atlas demo data, incl. `sortOrder` -1/1/desc, give
    the same statuses, counts and ids before and after. Found: `generateRandomNumber` (`Math.random`) makes the 6-digit
    verification code and order/credit ids — use `crypto.randomInt` for any code that survives Phase 5
- [x] `env.js` with zod; replace `config/*.js`; `.env.example`
  - Done 2026-10-28 (api-engineer, reviewed + audited): `src/env.js` is the only reader of `process.env` — pure
    `parseEnv(source)` + a validated, frozen `env`; blank values count as unset. Required: `MONGODB_URI`,
    `ENCRYPTION_KEY` (exactly 32 utf8 bytes), `RAZORPAY_KEY_ID` (must start `rzp_test_`, so `rzp_live_` is refused in
    every environment, not only demo), `TWILIO_ACCOUNT_SID` (`AC…`), `TWILIO_AUTH_TOKEN` (the vendor keys stay required
    until the adapters step). Defaults unchanged. `ALLOWED_ORIGINS` items must be exact http(s) origins (no path,
    trailing slash or `*`). Failure: the server entry (now `src/server.js`) prints one message naming each bad variable and why — never a value —
    and exits 1. `appConfig.js` maps `env` to its old shape, so its 16 importers are unchanged; the old
    missing-config check is gone. `.env.example` matches the schema exactly, seed-only variables in their own section.
    33 API tests. Notes: `MAIL_FROM` must be a bare address (no `Name <…>` form); `STOREFRONT_URL` with a trailing
    slash makes `…//auth/reset` links (as before) — tidy in the legacy-bugs step; one key still signs JWTs and
    encrypts — consider separate keys in the security step
- [x] Split `app.js` (app setup) from server start; remove seed-on-boot and in-process cron
  - Done 2026-10-28 (api-engineer, reviewed + audited): `src/app.js` only builds and exports the app — the Phase 10
    Vercel handler (`module.exports = app`); importing it connects, listens and queues nothing. `src/server.js` is
    the local entry (env check → connect → listen; exits 1 on a bad env, a failed connect or a busy port); root
    `index.js` deleted. `connectToDb` shares one cached connect per process, kept through driver blips (an Atlas
    election doesn't open a second client) and cleared only after a failed attempt or a deliberate close; logs
    redact the URI. `requireDb` middleware (503 "Database unavailable") guards every `/api/v1` route except
    `GET /api/v1/`, plus sitemap/googleproducts/re-index — so unknown `/api/v1/*` paths answer 503 while the DB is
    down (404 when up). The lunr indexes build once on the first connection instead of at import (an idle cold
    instance used to `process.exit(2)` after 10 s); an indexing error is logged, not fatal; search endpoints return
    an empty success result until their index exists (storefront search is empty for the first moments after a
    cold start, until step 8 replaces lunr). `MONGODB_URI` refuses a raw `@` in the password. Removed: empty
    seed-on-boot (`scripts/seedData.js`), `src/jobs/` (`logTime` always blocked; `clearResources` cleaned a folder
    nothing writes; `deleteAccount` never worked), `cron`, `ENABLE_CRON`, `DELETE_ACCOUNT_DATA_AFTER`. No
    account-deletion purge, now or later (owner decision 2026-10-28: the demo has no real users). 47 API tests (boot test runs in-process)
- [x] Layering: routes → controllers → services → models. Split `order.controller` (1,609 lines), `auth` (738), `cart` (570), `storeBook` (411) into services
  - Split (proposed 2026-10-29): 4a first, then 4b, 4c and 4d in parallel worktrees. Behaviour-preserving: same
    routes, status codes, message keys and response shapes; legacy bugs and security fixes stay for their own steps.
    Services use the Mongoose models directly (no extra repository layer) and own every vendor call, so the adapters
    step swaps SDKs in one place per vendor. No file over ~300 lines
  - [x] 4a. Foundation: `src/services/` conventions, an `AppError` (code + HTTP status) that services throw and
        controllers map with the existing `res.*` helpers (the central handler arrives in step 9), and a test harness
        that runs the app against a throwaway in-memory MongoDB loaded with seed-shaped fixtures (fake data only), with
        Razorpay/Twilio/SendGrid/Delhivery/S3 stubbed. One small controller (favourites) converted as the worked example
    - Done 2026-10-29 (api-engineer, reviewed + audited): `src/services/README.md` (conventions + rules for the
      parallel split: no cross-branch service imports, domain-prefixed file names, frozen shared files, no
      transactions, exact legacy `res.*` forms); `helpers/appError.helper.js` (`AppError` + `handleControllerError`,
      byte-identical legacy envelopes); favourites → `favorites.service.js`, 25 route tests written against the legacy
      controller first. Harness in `test/helpers/`: `mongodb-memory-server-core` 11.3.0 (MongoDB 8.2.6 pinned,
      downloaded once over verified TLS to `~/.cache/mongodb-binaries`; CI must cache it), fake fixtures with
      per-branch id ranges, `createUser`, `mockVendorCall` for canned vendor answers, every vendor SDK stubbed and
      every non-local connection blocked. i18n `updateFiles: false`, so the API never writes `en.json`. 88 API tests
  - [x] 4b. Orders: `order.controller` (1,607 lines, 23 handlers) → thin controller + services split by
        responsibility: pricing, checkout and payment (Razorpay), order lifecycle (status transitions), shipping
        (Delhivery), returns/cancellations/refunds, admin queries and analytics. `order.helper.js` stays a shared helper. Tests for
        order pricing and every status transition
  - [x] 4c. Cart and auth: `cart.controller` (570) → cart pricing + cart mutation services; `auth.controller` (535) →
        session/token, password, verification (email/SMS) services. `cart.helper.js` stays a shared helper. Tests for cart totals
        and auth (register, login, token revoke, password reset)
  - [x] 4d. Catalog and the rest: store books, authors, bundles, collections, categories, deals, add-ons, mystery
        boxes, product sets, addresses, favourites (done in 4a), stock alerts, store credit, users, files → services.
        Tests for store credit and stock alerts
    - 4b–4d done 2026-10-29 in parallel worktrees (api-engineer ×3, each reviewed + audited; tests written and
      committed against the legacy controllers first, then the refactor with the tests unchanged). 4b: `order.controller`
      1,607 → 258 lines over ten `order-*` services, 213 tests (checkout pricing, Razorpay payloads and webhook HMAC,
      every one of the 12 stages against every transition, authz). 4c: cart 570 → 177 and auth 535 → 229 lines over
      seven `cart-*`/`auth-*` services, 124 tests (cart totals, cookies, register/login/revoke, password, email and
      SMS verification). 4d: 16 controllers over 18 services, 168 tests. API: 593 tests, ~21 s (one in-memory MongoDB
      per test file); lint warnings 43 → 24. Legacy bugs and leaks are pinned in tests and JSDoc, not fixed; the audits'
      new findings are in the security step above. Not covered: production-only notification paths (adapters step).
      Declared changes: stock saves now awaited; two hanging error paths now 500; debug logs of the SMS text and the
      contact payload removed. Follow-up for the test-writer: move the shared test utilities duplicated in
      `fixtures/orders.js` and `fixtures/store.js` into `test/helpers/`
  - [x] 4e. After 4b–4d merge: fold the shared `helpers/*.helper.js` (`order`, `cart`, mail) into the services that
        own them; no behaviour change
    - Done 2026-10-29 (api-engineer, reviewed + audited): `cart.helper.js` and `order.helper.js` deleted — each
      function now lives in the service that owns it (`calculateTotal` in `cart-pricing`, shipping and weight in
      `order-pricing`, pickup address in `order-shipping`, payment info in `order-queries`, the SMS text in
      `order-notifications`, the Delhivery pincode check in `address.service` until the shipping adapter); the CDN
      image-URL builders moved to `helpers/image-url.helper.js` (the sitemap and Google feed use them; `libs/` never
      imports services). The mail-queue helpers stay until the mail step. Generic test utilities shared in
      `test/helpers/` (`assert.js`, `mail.js`, `settle.js`); `api.stop()` waits for in-flight database writes instead
      of fixed delays. 593 tests, lint warnings 24 → 16
- [x] Replace Joi with shared zod schemas + `validate()` middleware
  - Split (2026-10-29): one engineer, two commits, one review. 5a first, then 5b on top
  - [x] 5a. Swap with no behaviour change: `validate(schema)` middleware on the `@pageaters/shared` request schemas
        (built in Phase 3 with Joi's error codes and conversions), same 400 envelopes, every Joi validator and the
        `joi` dependency removed; the existing tests pass unchanged
  - [x] 5b. Tighten the contracts (deliberate changes, each pinned by a test):
    - validator bugs (moved here from the legacy-bugs step): `objectId` never required (`cart/add`, `favorites`,
      `address/:id`, `order/attempt` accept a missing id); any extra query key (a cache-buster) answers 400 — ignore
      unknown query keys; no validator on `PUT /address/:id`, `order/create-shipment`, `order/return`, `order/cancel`;
      email not lower-cased
    - the contracts deferred until now because they break Joi parity: max lengths
      on tokens, address and gift fields; pin code `^\d{6}$`; a raw password length cap; store-credit `amount` ≥ 0 on
      `PATCH /orders/credit` and > 0 on admin `issueCredit` (a zero credit would record an empty transaction and
      e-mail the customer); the `_CID` cart cookie must be a 24-hex id (`cartValidator`;
      blocks the cookie operator injection in 7c); upload `fileModule` must be a known module, checked before the S3
      upload (400) — today an unknown one answers 200, then the unawaited `File.create` rejects and the unhandled
      rejection exits the process, leaving an orphaned S3 object
  - Done 2026-10-29 (api-engineer, reviewed + audited; two fix rounds). 5a: `middlewares/validate.middleware.js` runs
    the `@pageaters/shared` request schemas over `req.allParams()` where the Joi validators ran (same position, same 400
    envelope); `src/validators/`, `requestValidator` and `joi` removed; the 593 existing tests passed unchanged. 5b:
    ids required; unknown query keys ignored (unknown body keys still refused); validators added on address update,
    order credit/return/cancel and the admin shipment routes (path ids validated, so `?orderId[$ne]=` is refused);
    emails trimmed + lower-cased via `req.validated` (passwords never trimmed); length caps; 6-digit pincode; store
    credit ≥ 0 shopper / > 0 admin, paise precision, ≤ 100,000; cart quantity ≤ 100 and gift cost ≤ 1000; the `_CID`
    cookie must be an id (`helpers/cart-cookie.helper.js`, cart routes and checkout); upload `fileModule` checked
    before S3. A validation error with no message key answers the fixed `INVALID_REQUEST`, so a 400 never echoes input
    (new keys `INVALID_AMOUNT`, `INVALID_REQUEST`). Admin catalog create/update are not validated yet: the shared
    admin schemas expect https image URLs and every key on update, which the legacy admin doesn't send — apply them
    with the Phase 8 admin rebuild. The API now depends on `@pageaters/shared` (built first by turbo `test`, `dev`,
    `build`). API 631 tests, shared 157
- [x] Adapters: payments (Razorpay + mock), sms, email, shipping (Delhivery + mock), storage (Vercel Blob)
  - Split (2026-10-30): 6a first (sets the pattern), then 6b. Each adapter has a real and a `mock` implementation,
    chosen per adapter by env; vendor keys become required only for the adapter that uses them. Mocks keep what they
    would have sent in memory (Phase 5 turns that into the outbox collection)
  - [x] 6a. Pattern + email + SMS: `src/adapters/<kind>/` with an interface (JSDoc), real and mock implementations and
        a selector; email (SendGrid) replaces the in-memory `better-queue` mail queue with direct awaited sends
        (serverless-safe; moved here from the lunr/mail step); SMS (Twilio) for the order SMS and contact OTP. Tests
        run on the mock adapters and finally cover the production-only notification paths
    - Done 2026-10-30 (api-engineer, reviewed + audited; one fix round). `src/adapters/{email,sms}/` with
      `types.js` (JSDoc contract), `sendgrid.js`/`twilio.js` (`create(config)`, SDK required inside, 10 s timeout,
      vendor errors rethrown as `Email/SMS send failed` with code/status only) and `mock.js` (newest 50 messages via
      `adapters/recorder.js`); `EMAIL_ADAPTER`/`SMS_ADAPTER` default to `mock`, and SendGrid/Twilio keys are required
      only when that adapter is selected. The `better-queue` mail queue is gone: `services/mail.service.js` renders and
      awaits every send (a failure never fails the request; the contact OTP SMS still answers 500). Found and fixed:
      `ejs.renderFile` without an options argument let template data set ejs options — the unauthenticated
      `POST /public/contactUs` could run code on the server; now rendered with a fixed options object and the contact
      form passes only its template's keys. Stock alerts close per send. The production-only notifications are now
      tested (`environment.isProduction()` read per call). 670 API tests
  - [x] 6b. Payments (Razorpay: orders, webhook signature, refunds), shipping (Delhivery: pincode serviceability,
        shipment create, return pickup) and storage (Vercel Blob replaces S3; `aws-sdk` and `axios` removed if unused;
        the image-URL helper passes full Blob URLs through)
    - Done 2026-10-30 (api-engineer, reviewed + audited; one fix round). `src/adapters/{payments,shipping,storage}/`
      on the 6a pattern, selected by `PAYMENTS_ADAPTER`/`SHIPPING_ADAPTER`/`STORAGE_ADAPTER` (default `mock`). Payments:
      Razorpay order create (payload unchanged) and webhook signatures checked by a shared constant-time HMAC helper —
      with no `RAZORPAY_WEBHOOK_SECRET` nothing verifies, and the secret is required when `APP_ENV` is staging or
      production (a first draft let a public test secret forge "payment captured"); mock order ids are salted per
      process; the `rzp_live_` refusal still applies whenever a key is set. Shipping: Delhivery via `fetch` with a 10 s
      timeout, token in the `Authorization` header, pincode encoded, create body built with `URLSearchParams` (an `&` in
      an address or title broke it and allowed form-field injection), vendor errors logged by code only; `axios` removed.
      Storage: Vercel Blob replaces S3 (`aws-sdk`, `S3_*` and `IMAGE_CDN_URL` removed), uploads land under `uploads/…`,
      answer the public URL and await the `File` record. `imageUrl` passes https URLs through (normalised) and the
      legacy CDN-key path is gone. 714 API tests
- [x] Security fixes, by area (each found while reading the legacy code or by the step audits; 4b–4d pin them in tests,
      so a fix flips the pinned test). `POST /admin/banavo` was removed early on 2026-10-28 (admins come from the seed)
  - [x] 7a. Perimeter: single CORS allowlist (remove reflect-any-origin); mount the rate limiters on every public route,
        naming login, OTP/verification sends and the public `GET /addresses/check-pincode/:pincode` (anyone can spend
        the Delhivery quota); per-route body limits (drop the global 100 MB and `multer().any()`; a per-route upload size limit, and check an
        upload's magic bytes match its extension); protect `/re-index`;
        `mongoose.set('sanitizeFilter', true)` — route params aren't protected while `req.allParams()` lets the body and
        query replace them (e.g. `GET /orders/getByUniqueId/:uniqueId?uniqueId[$ne]=`, limited to the shopper's own
        orders); long term controllers read `req.validated` / `req.params` only; auth audit on every route, incl. `POST /orders/create-shipment/:orderId`
        (guarded only as USER with no owner filter — any shopper can ship any paid order; guard as ADMIN); remove
        `POST /public/contactUs` (unauthenticated mail trigger) and `GET /store-books/bulk/export` (unauthenticated,
        writes to local disk, and two simultaneous exports share one file path, so the second `unlinkSync` throws
        outside any `try` and crashes the process)
  - [x] 7b. Sessions and passwords: HIGH — a revoked token still opens a session (`permissionVerification` never checks
        `access_tokens.revoked`; logout, password change and reset end no sessions) — require an unrevoked token and
        revoke all of a user's tokens on password change/reset; move password hashing from HMAC-SHA512 to scrypt/argon2
        (rehash on next login) and compare with `crypto.timingSafeEqual` (`isPasswordValid` uses `===`);
        password-reset and verify-email tokens never expire and use AES-CBC without a MAC — expire them (~1 h reset,
        ~24 h verify) and use a random token stored as a hash; split the JWT signing key from the encryption key;
        contact OTP has no expiry, no attempt cap and no limit on the first send (SMS pumping) — ~10 min expiry,
        ~5 attempts, per-user/IP send limit, constant-time compare, `crypto.randomInt` instead of `Math.random`; the
        verify-email resend limit reads the misspelt `lastverifyEmailSentOn`, so it never applies;
        `permissionVerification`'s `req.user` select leaks `contactOtp` and rate-limit stamps. Phase 5 replaces signup
        and OTP with the one-click demo login, so fix only what survives it (sessions, passwords, admin login)
  - [x] 7c. Order money and cart integrity: HIGH — a shopper can pay less: apply store credit, `POST /orders/create`
        (online; the Razorpay order is made for the reduced total), then `PATCH /orders/credit` to 0 (allowed in any
        stage), pay the reduced amount, and the webhook debits 0 credit; the balance is checked only when credit is
        applied, so one balance can go to several pending orders and go negative — allow credit only on `attempted`
        orders, check the captured amount equals `total × 100` in the payment webhook, debit with a guarded `$gte`
        update; the payment webhook accepts any correctly signed event (check the event type and
        `payment.entity.status === 'captured'`) and signs over `JSON.stringify(req.body)` instead of the raw bytes (verify the
        raw body via `express.json({ verify })`); gift-wrap cost comes from the request (use a server price list);
        `attemptOrder` finds the cart by id only (add the owner); HIGH — NoSQL operator injection through the `_CID`
        cart cookie (cookie-parser decodes `j:{"$in":[own, victim]}`; ownership is checked by `findUserCart`, but the
        writes filter on `{_id}` only) lets a shopper write to other users' carts — write with the found cart's `_id` +
        `user` (the cookie format check is in the zod step)
  - [x] 7d. Data exposure: admin users `getAll`/`getAllDetails`/`search` return full user documents (hash, salt, OTP,
        tokens, `razorPayCustId`) — respond through `userSchema`; admin `users.search` and `orders.search` put raw `q`
        into `$regex` (ReDoS/regex injection: `.*` matches everyone, `(` → 500) — escape it; admin users `update` runs
        `findOneAndUpdate({})`; admin `order.getById` returns the raw Razorpay payment entity (payer contact,
        card/bank/VPA) — map through `orderPaymentInfo` and store only the summary; public `GET /store-books/unique/:id`
        and admin `/store-books/get/:id` send `wholeSalePriceHistory`, and create/update accept and store it (project
        it out, `select: false`, stop reading it); `log_email` stores the full rendered html (reset and verify links with their
        tokens, buyer names, addresses, order totals) — store module, recipient, subject and time only with a TTL, or drop
        it once the Phase 5 outbox exists; links to the reserved root domain in `stockAlert.controller.js`
        (`https://pageaters.com/book/…`), `libs/sitemap.js`, `libs/googledata.js` and the email templates → the demo
        domain from config
  - Done 2026-10-30 in four parallel worktrees (api-engineer ×4, each reviewed + audited, one fix round each; merged
    by hand: `mongoose.trusted` wraps reconciled, webhook fixtures and cookie pins updated). 7a: one CORS allowlist,
    rate limiters on by default (general + login, message sends, code checks, pincode; trust proxy only on Vercel,
    `APP_ENV=test` refused on Vercel), 100 kb JSON limit, urlencoded parsing dropped, uploads as a single ≤ 4 MB
    file after the ADMIN guard with magic bytes and server-side content type, `/re-index` ADMIN, create-shipment
    ADMIN, `sanitizeFilter` on, contactUs and the bulk export removed, webhooks verified over the raw bytes. 7b:
    unrevoked hashed session tokens with a per-user `sessionVersion` (logout, password change and reset end every
    session; a racing login can't survive or write the old password back), scrypt with legacy HMAC upgraded on login,
    HKDF JWT key, hashed one-time reset/verify tokens with expiry, OTP expiry/attempt cap/atomic send allowance,
    `SameSite=Lax`/`Secure` cookies, `deleteAccount`/`recoverAccount` removed (also from `packages/shared` and the
    api-client). 7c: one pending order per user, credit only before payment and never above the order value,
    captured amount/currency/event checks, claim-then-debit with a guarded `$gte` and compensation, atomic place,
    stored payment summary (no card name, masked VPA), server gift prices, owner filters on every cart write. 7d:
    admin users answer `userSchema` fields only, escaped search, payment summary in every admin order response,
    `wholeSalePriceHistory` hidden and never accepted, `log_email` slimmed with a 30-day TTL, every root-domain link
    built from `STOREFRONT_URL`, the old business's social links removed from e-mails. 840 API tests
  - Follow-ups: the seed still hashes with HMAC (upgraded on first login) — switch `seed/src/accounts.ts` to the API's
    scrypt format and fix its comment; the storefront should log the shopper out after a password change (Phase 7);
    owner decisions (2026-10-30), done: `PUT /users/:id` removed (no admin route edits a user now), and the 19
    e-mail, sitemap and storefront images on the closed old Cloudinary account removed (the owner adds replacements
    later; the storefront shows a text wordmark meanwhile). Also removed with them: the storefront's unused
    `via.placeholder.com` image host and the leftover Brevo/PushOwl service worker; the home page's share URL now
    comes from `NEXT_PUBLIC_SITE_URL` instead of the root domain
- [x] Replace lunr in-memory index with a per-request MongoDB query (the mail queue moved to adapters 6a)
  - Done 2026-10-30 (api-engineer, reviewed + audited): reworded from "MongoDB text index / Atlas Search" — `$text`
    can't match the start of a word (type-ahead `tw` → "Two") and Atlas Search isn't in the in-memory test DB or
    within the free tier's index cap; see `docs/adr/0002-catalogue-search-word-prefix-regex.md`. All five searches use
    an escaped, case-insensitive word-start regex over lunr's fields (≤ 100 chars, ≤ 5 terms, AND across terms, OR
    across fields), at most 10 live records, most popular first (categories: most books), 1 s query time limit; a
    non-string `q` answers `[]` and control characters count as spaces. Catalogue writes are visible at once. Removed: `libs/indexing.js`, the indexing on connect, ADMIN
    `/re-index`, the `lunr` dependency, `api.reindex()` in the tests
- [x] Central error handler, pino logging, request IDs, `/health`
  - Done 2026-10-30 (api-engineer, reviewed + audited, two fix rounds): pino 10.4.0 (morgan removed) with `LOG_LEVEL`
    (silent in tests); redaction by key name at any depth (credentials, OTP, cookies, signatures, e-mail, phone,
    address), Mongoose documents converted first, errors logged as type/code/status/stack only (never a message that
    can carry data; `err` never carries arbitrary data), child bindings redacted. Request ID per request (a safe
    incoming `x-request-id` reused), `X-Request-Id` on every response, one access line with the route pattern (never
    the concrete path or query). One mapping for errors: unmatched routes, malformed JSON, oversized bodies, malformed
    path encoding and a down database answer the JSON envelope (404/400/413/400/503) instead of Express's HTML pages;
    anything else 500 `SOME_ERROR_OCCURRED`. `logRequest` and the `log_api` model removed; `no-console` is an error
    in `src`. Unhandled rejections are logged and the process keeps serving; uncaught exceptions are logged and exit.
    `GET /health`: unauthenticated, connects (≤ 2.5 s) and pings (≤ 1 s), answers only `{status}` 200/503. 885 API tests
  - Follow-ups: drop the old `log_api` collection (request headers, cookies and plaintext passwords) from any database
    that ran the old code — owner, one-off on the local dev DB; nothing is deployed yet. Await the remaining legacy
    `void …save()`/unreturned creates (deal destroy, store-book, category and mystery-box create, upload `File.create`)
    in the legacy-bugs step, so the rejection handler stays a safety net. Document `/health` and `LOG_LEVEL` in
    `docs/deployment.md` (Phase 10)
  - Remove `logRequest` (`extendReq.middleware.js`): it `console.log`s full request headers (the `_PID` session
    cookie), `req.user` and `req.allParams()` (plaintext passwords on failed login, password change and reset) and
    upserts headers + params into `log_api` — drop the `log_api` model (or keep method, URL, status, request ID only);
    pino `redact` rules for cookies, `authorization`, `set-cookie` and password/OTP/token fields
  - Process-level `unhandledRejection`/`uncaughtException` logging: several legacy writes aren't awaited and any of
    them can take the process down
  - The central handler must recognise the cart's `ProductMismatchError` (4c) and keep its legacy body
  - Body-parser errors (too large, malformed JSON, too many params) answer the JSON envelope (413/400), never
    Express's HTML page with a stack trace
  - `res.internalServerError` must not `console.log` raw errors (vendor messages can quote the recipient); the
    `createShipmentForDelhivery` failure log prints code and status only, never `e.message`
- [x] Fix legacy bugs. Split into five sub-steps by the files they touch (2026-10-30), so independent ones run in
      parallel worktrees (at most three at once): wave 1 = a, c, e; wave 2 = b, d (b after a: both edit the order
      code; d after c: both edit list paging). Items already fixed by earlier steps (`deleteAccount`/`recoverAccount`
      removed, `jobs/` removed, the duplicate `retrieve`) are checked and left out.
  - Follow-ups (2026-10-30, after the owner's demo-first decision below), placed:
    - Sub-step f (minor fixes only): a book create with an unknown author, and `:id`/`category` values that aren't
      ObjectIds (public catalog routes, stock alerts, add-on/deal/mystery-box admin routes) answer 500 instead of 400;
      a deal whose product set was deleted 500s on its detail page; the deal admin detail's author populate path
      (`products.product.author`) is wrong
    - Known demo limitations, not fixed on purpose (rare races and failure paths): a failed register can leave an
      account without a password; two simultaneous book updates can count a category twice; return/replace and
      return-shipment writes aren't conditional; ship/deliver answer 500 if their e-mail fails; a Delhivery waybill
      booked for an order that lost a race is cancelled by hand; a payment confirmed late while the shopper switched
      to COD is refunded by hand
    - Phase 7 (storefront): `FeaturedDeals` sends `offset: 1` (now ignored) — ask for `page: 1, limit: 4` and drop the
      first, or delete the unmounted component
    - Phase 8 (admin): ship/deliver/cancel errors show "[object Object]" (the snackbar gets the envelope); show the
      message, e.g. for the 409
    - Phase 10: check after deploy that the `one_pending_order_per_user` index exists (needs MongoDB 6.0+)
    - Docs: the list paging contract (public max 50); deals list by priority by default; a product set's slug never
      changes; store credit is spent once applied
    - Owner, one-off: re-run the seed sanitise step so the local `seed/data/product-sets.json` drops the 14 inactive
      sets
    - Tooling: the seed tests create `seed/data/fonts`, which makes shared's `seed-data.test.ts` stop skipping and
      fail when both run together (skip on the missing files instead); `pnpm --filter api test` uses the built
      `packages/shared/dist`, so run `pnpm turbo run build --filter=@pageaters/shared` first or the suites fail in
      their hooks and never exit
  - [x] Owner decisions, 2026-10-30 (store rules + simplification): store credit is a coupon — once applied it is spent,
        never returned on cancel or refund (a refund returns only money paid), so remove the credit-return machinery
        from a and b (`storeCreditReturn`, `RF-` credit rows, `appliedCreditIds`); no cancel after shipping (admin too);
        public list pages max 50, admin up to 1000
    - Done 2026-10-31: the credit-return machinery is removed (cancel and refund leave the balance alone; a failed
      checkout still undoes its debit); admin cancel only for paid/confirmed orders (`ORDER_CANCEL_INVALID` after
      shipping); public lists capped at 50 by `pageLimit.middleware.js` (an ADMIN session may ask for up to 1000);
      storefront store-credit copy updated. Phase 8: hide the admin Cancel button after shipping. Reviewed (one light
      round)
  - [x] a. Orders: placement, payment and refunds (money). `placeOrder` and `getPendingOrder` pick any pending order,
        so with a `created` order waiting for payment `/orders/create` re-places the older one (7c); enforce "one
        pending order per user" with a unique partial index on `{ userId }` for attempted/created orders (two
        simultaneous attempts can still create two); re-read the order before compensating a debit (a lost write
        acknowledgement can return credit for a paid order); dedupe partial refunds by refund id; refuse or cancel a
        COD place while a live Razorpay order exists (a late payment of it is only logged and needs a manual refund);
        refunds don't return applied store credit; `issueCredit` has no validator (negative credit); order line totals
        aren't floored while the cart subtotal is; `orders.create` 500s without `giftOptions`
    - Done 2026-10-30: newest pending order wins; unique partial index `one_pending_order_per_user` (a lost race
      answers 400 `ORDER_PENDING_CONFLICT`; the test harness waits for indexes); the payment webhook releases its
      claim before giving credit back, and COD puts the order back (or cancels it when a newer checkout exists)
      before giving credit back, every unresolved case logged; refunds deduped by refund id (`refundIds`); COD is
      refused while a Razorpay order exists (400 `ORDER_ONLINE_PAYMENT_PENDING`); a full refund returned the applied
      store credit once (`storeCreditReturn` pending → crediting → returned, one `RF-<order _id>` CREDIT row under a
      unique partial index, the balance step keyed by `appliedCreditIds`), so a redelivery finishes an interrupted
      return; create without `giftOptions` answers 200. `issueCredit` validation and floored line totals were
      already fixed. Shared: `RF-` credit ids, optional `refundIds`/`storeCreditReturn` on `orderSchema` (not
      shoppers'). Reviewed (three rounds) + audited. The credit return was removed on 2026-10-31 (store credit is a
      spent coupon; see the owner decisions sub-step)
  - [x] b. Orders: details, analytics, checkout and notifications. `order.getByUniqueId` calls `orderPaymentInfo(null)`
        (500) for an order without payment; analytics: best-selling matches `status` not `orderStatus`, dates are
        compared as strings (always `[]`), and `startDate`/`endDate` must be parsed to dates (aggregations aren't
        sanitised); a return after 7 days answers 200 `ORDER_RETURN_PERIOD_LAPSED`; checkout select misspells
        `boxed`; checkout stores bundle lines unpopulated, so the confirmation e-mail's bundle line has no title or
        poster (pinned in 6a); `GIFT_PACKAGES` is duplicated in the API and the storefront — move it to
        `packages/shared`; cancelling an order (shopper or admin) doesn't return its applied store credit (found in a)
    - Done 2026-10-30: an order without payment answers `payment: null` (the storefront order page guards it);
      analytics count fulfilled orders by `orderStatus` over real dates, the range validated strictly (ISO with
      offset, start before end, else 400 `ORDER_ANALYTICS_INVALID_RANGE`); a return after 7 days answers 400; the
      checkout reads `boxes`; the confirmation e-mail's bundle line has its title, poster and a `/bundles/` link;
      `GIFT_PACKAGES` lives in `packages/shared` (subpath `@pageaters/shared/gift-packages` for the storefront's
      TS 4.5); a cancel returned applied store credit (removed 2026-10-31: store credit is a spent coupon); ship, Delhivery booking, deliver and cancel are conditional on the stage they read
      (`order-transition.service.js`; a lost race answers 409 `ORDER_CHANGED_CONFLICT`, a booked waybill is logged
      for manual cancellation); a cancel restores stock and credit before e-mailing and logs a cut-short return.
      Reviewed (two rounds) + audited
  - [x] c. Catalog admin: inputs, create/update and list paging. Validate product-set `categories` and author `books`
        as ObjectId arrays (7a); author/collection/bundle/book create and update crash when a list field is missing;
        list endpoints (e.g. `GET /categories`) return no documents without `page`/`limit`, answer `page: null`
        without `page`, and sort on `undefined` without `sortBy` — add defaults; `category.controller` sorts on
        `Number('asc')` (NaN); the book update's category count is a `void categoryRes.save()` — await it
    - Done 2026-10-30: `helpers/paging.helper.js` (page 1, limit 10, max 1000, newest first with an `_id` tiebreak,
      `asc`/`desc`/`1`/`-1`, 400 `INVALID_PAGING`) on every catalog list except deals/add-ons/mystery boxes;
      reference checks (`validate()`, optional ObjectId arrays) on admin create/update of authors, books,
      bundles, collections and product sets, refused before any write — product-set entries also accept the
      legacy admin's populated book (only the id is stored); a missing list no longer 500s; an empty product-set
      `categories` filter means none; book category counts +1/−1, awaited, never below 0. Storefront lists that
      send no sort now show newest first. Reviewed (three rounds) + audited
  - [x] d. Catalog extras: add-ons, deals, mystery boxes, product sets. Add-on `update` (undefined `id`/`addOnId`,
        ReferenceError) and `getById` (undefined `bundles`) always 500; `getByProductId` ignores `productId`; the
        grouped endpoint doesn't filter soft-deleted add-ons; `storeDeal.contoller` passes `offset: parseInt(undefined)`
        so the deals list returns `page`/`offset`/`pagingCounter` as null; deal `getById` uses author messages and
        `destroy` doesn't await `save()`; mystery-box `destroy` writes `deactivatedAt` (not in the model); renaming a
        product set regenerates its slug (breaks links); seed loads 14 inactive product sets the API never serves;
        delete the dead `book.model.js`; use c's `paging.helper.js` for the deals list; the shared category, deal,
        add-on and mystery-box update schemas still say an omitted field is written as null (Mongoose 8 drops it)
    - Done 2026-10-30: add-on update/detail work, the grouped list hides deleted add-ons and returns the public
      fields only, `productId` must be a live store book (add-ons have no product link, so every book gets the same
      list); add-on create/update validated (non-negative price, discount 0–100); deals, add-ons and mystery boxes
      use the paging helper (no `offset`; deals default to priority ascending); deal detail uses `STORE_DEAL_*`, its
      update is one atomic write, delete awaits the save, its product sets must exist and be active (the legacy
      admin's populated sets accepted, only ids stored), `GET /deals?category=` validated; mystery-box delete
      stamps `deletedAt`; a product set keeps its slug on rename; the seed drops inactive product sets;
      `book.model.js` removed; the update-schema comments corrected. Reviewed + audited
  - [x] e. Auth, account, cart, addresses, stock alerts, uploads. Await `user.save()` in register, login and contact
        OTP send/resend (a failed save is an unhandled rejection and the resend limit can fail open); `updatePassword`
        saves the old `password` instead of `newPassword`; `PUT /auth/me` validates `contactNo` but ignores it;
        `PUT /addresses/:id` checks existence with an unfiltered `findOne()` and `$set`s every field; `check-pincode`
        returns the courier's raw record; cart `add`/`addAddOn` return `true` or the cart; `/cart/empty` clears books
        only; `addAddOn` has no default quantity; unsubscribing a missing stock alert answers `STOCK_ALERT_EXISTS`;
        the `STOCK_ALERT` e-mail has only `en.html` but the renderer loads `en.ejs`; upload doesn't await
        `File.create` and returns a storage key, not a URL
    - Done 2026-10-30: auth/OTP saves, `updatePassword` and upload were already fixed (tests added for failed
      writes: no cookie, no text, the resend limit fails closed); `PUT /auth/me` refuses `contactNo` (a number
      changes only through OTP); `PUT /addresses/:id` touches only the caller's live address and one field
      allowlist, re-checks a changed pincode, clears other defaults only after the update; check-pincode answers
      serviceability only; cart add/add-on answer `true` with quantity defaulting to 1 (add-on route validated);
      `/cart/empty` clears every line; `STOCK_ALERT_NOT_EXIST`; the STOCK_ALERT e-mail renders (`en.ejs`, escaped,
      control characters stripped from the subject). Reviewed + audited
  - [x] f. Minor fixes listed above under "Sub-step f"
    - Done 2026-10-31: a malformed ObjectId string in a request answers 400 `INVALID_ID` on every route (one mapping
      in `handleControllerError`; other casts stay 500); book create with an unknown author answers 400
      `AUTHOR_NOT_EXIST` before writing; deal detail skips deleted or deactivated product sets; the deal admin detail
      carries author names. Reviewed (one light round)
- [x] OpenAPI from zod at `/docs`
  - Done 2026-10-31: OpenAPI 3.1 built from the shared zod schemas with zod 4's `z.toJSONSchema` (no generator
    library), on first request and memoised; `/openapi.json` plus a Scalar reference at `/docs` (pinned CDN bundle
    with SRI, CSP scoped to that route). 144 operations, 156 schemas; a test checks every mounted route is documented
    and the document validates as OpenAPI 3.1. `docs/api.md` explains it. Reviewed + audited (one light round)
- [x] Remove `page.controller` / page & banner models (moved to CMS); move sitemap + Google product feed to storefront
  - Done 2026-10-31: `page.controller` and the page/banner models were already gone; `libs/sitemap.js` and
    `libs/googledata.js`, their routes and `js2xmlparser`/`xml-js` are removed. Demo scope: the Google Merchant feed is
    dropped; the sitemap is rebuilt as `app/sitemap.ts` in the Phase 7 storefront
- **Checkpoint:** API runs locally, all routes reachable, lint and tests clean
  - Passed 2026-10-31: API started locally on :5005; `/health`, `/`, `/api/v1`, `/openapi.json`, `/docs` and all 14
    public GET routes without path params answer 200, a session route answers 401, `limit=51` on a public list answers
    400; API 985/985, shared 173, api-client 264, seed 88 tests pass; lint and typecheck clean; gitleaks clean

## Phase 5 — Demo mode

Trimmed 2026-10-31 (scope trim, below). Work runs in batches whose code nothing later in the phase touches; each
batch gets one combined review (AGENTS.md §10). Each step brings its own tests.

- [x] Batch A — access and config
  - [x] `DEMO_MODE` flag. With `DEMO_MODE=true` the API refuses to boot unless `EMAIL_ADAPTER` and `SMS_ADAPTER` are
        `mock` and no SendGrid/Twilio keys are set (the `rzp_live_` guard is already done in `env.js`)
  - [x] Demo shopper one-click login; signup and OTP login off in `DEMO_MODE`; remove the email-OTP login, which can
        sign into any account by email
  - Done 2026-10-31 (inline, reviewed + audited): `DEMO_MODE` (env.js) refuses non-mock e-mail/SMS adapters and any
    SendGrid/Twilio key. `POST /auth/demo-login` (404 outside demo mode, own `demoLogin` limiter 20/15 min) signs into
    the seeded demo shopper; register and the `/auth/contact/*` OTP routes answer 400 `OFF_IN_DEMO_MODE`
    (`middlewares/demoMode.middleware.js`); password login stays for admins. The email-OTP login was already gone
    (Phase 4). api-client `auth.demoLogin`, OpenAPI entry, tests. The storefront button comes with Phase 7
- [x] Batch B — demo write guard
  - [x] One server-side guard: in `DEMO_MODE` the demo admin's catalog writes, uploads and store-credit issuing are
        rejected with a clear demo message; order lifecycle actions (mock shipping) stay allowed; the super-admin is
        exempt from all of it
  - [x] Demo admin one-click login (added 2026-10-31 with the owner: the demo admin's password is random, so without
        it no visitor could reach the admin and the checkpoint couldn't pass)
  - Done 2026-10-31 (inline, reviewed + audited): `POST /auth/demo-login/admin` (DEMO_MODE only, `demoLogin` limiter).
    `demoAdminReadOnly` (`middlewares/demoMode.middleware.js`) runs after the ADMIN check on the 27 catalog writes,
    `POST /file/upload` (before the multipart parser) and `POST /store-credit`: the demo admin (by its seeded email,
    `constants/demo.js`) gets 400 `DEMO_ADMIN_READ_ONLY`; order actions and reads stay open; any other admin is
    unaffected. api-client `auth.demoAdminLogin`, OpenAPI notes, tests
- [x] Batch C — outbox
  - [x] Mock email/SMS write to an outbox collection; `GET` lists the caller's own messages (super-admin: all);
        forgot-password and verify-email are off in `DEMO_MODE`, so the demo admin's account can't be taken over
  - Done 2026-10-31 (inline, reviewed + audited): in `DEMO_MODE` only (outside it the mails' reset/verify tokens must
    never be stored, and `GET /outbox` is a 404), the mock adapters also save each message to `outbox`
    (`services/outbox.service.js`; skipped without a DB connection, a failed write only logged; the in-memory lists stay
    for tests). `GET /outbox` (any session): the newest 50 sent to the caller's e-mail or `+91<contactNo>`, newest
    first; an admin other than the demo admin sees all. Verify-email, its resend, forgot-password, its resend and
    reset-password answer `OFF_IN_DEMO_MODE`. Shared `shopperOutboxResponseSchema`, api-client `outbox.list`, OpenAPI
    `Outbox` tag, tests
- [x] Batch D — demo data upkeep (after A–C are committed)
  - [x] Weekly cleanup endpoint (protected by a cron secret, `DEMO_MODE` only): wipe visitor carts, addresses,
        favourites, orders and outbox, put back the stock those orders took, then create a small set of sample orders
        across the lifecycle through the order services
  - Done 2026-10-31 (inline, reviewed + audited): `GET /demo/cleanup` (DEMO_MODE only, 404 otherwise;
    `Authorization: Bearer <CRON_SECRET>`, compared in constant time; `CRON_SECRET` required with `DEMO_MODE=true`),
    `services/demo-cleanup.service.js`: puts back the stock of every order past checkout that wasn't cancelled,
    deletes all orders, carts other than the demo shopper's (emptied), addresses other than its seeded one (put back
    as seeded), favourites, newsletter sign-ups, stock alerts and the outbox, resets the demo accounts' names, then places four COD sample orders through the
    order services: confirmed, shipped, fulfilled, cancelled (their e-mails fill the outbox). The Vercel Cron entry
    (weekly) is set up with the deployment in Phase 10
- **Checkpoint:** demo shopper can browse and order; demo admin can run the order lifecycle but not edit the catalog

## Phase 5½ — Scope trim

- [x] Review Phases 5–11 against the demo scope (decision log) and cut or shrink what is enterprise polish rather
      than skill or architecture showcase
  - Done 2026-10-31 (pulled forward from after Phase 5, with the owner): the cuts are listed under "Dropped for the
    demo" at the end of this file

## Phase 6 — CMS (Payload)

- [ ] `apps/cms` scaffold: Payload 3, MongoDB adapter (separate DB), Vercel Blob storage adapter
- [ ] Collections: Pages, Templates (one `type` per page: Product, Collection, Category, Bundle, Book Box), Overrides,
      Media, Users (roles: admin, demo-readonly); seed the CMS read-only demo user
- [ ] Globals: Header (with navigation), Footer, Announcement Bar, Theme tokens, SEO defaults
- [ ] Blocks: Banner (one block with a layout option, replacing the five legacy banner variants), Product Set row,
      Featured Books, Carousel (collections, categories, bundles or deals), Rich text; template core blocks (product
      info + buy box, listing header + grid) locked
- [ ] Commerce pickers: fields that pick a product set, collection or category from the API and store only its ID
- [ ] Drafts, versions and live preview; `afterChange` hook → storefront revalidation webhook
- [ ] `packages/cms-types` generation wired into Turbo
- [ ] Seed CMS content: the homepage, one template per page type, header, footer and theme
- **Checkpoint:** owner edits the homepage in the CMS and sees it locally

## Phase 7 — Storefront rebuild (App Router + Tailwind/shadcn)

- [ ] New Next.js App Router app; Tailwind + shadcn/ui; theme tokens from the CMS as CSS variables. Images only from
      Blob and Open Library (the closed AWS account's bucket and CloudFront hosts are not carried over)
- [ ] Components for the kept blocks, close to the original look (not pixel-matched); block registry + safe renderer + per-block Suspense
- [ ] Routes: `/` and `[...slug]` (CMS pages), `/books/[id]`, `/collections/[id]`, `/categories/[id]`,
      `/bundles/[id]`, `/book-boxes` (templates + overrides)
- [ ] Code-owned: demo login, cart, checkout with Razorpay test mode (end to end), orders list and detail, address
      select
- [ ] Header/footer/announcement from CMS globals; footer credits "Cover images via Open Library"; the owner's logo,
      favicon and share image; demo banner
- [ ] Caching with tags + revalidation route; draft mode for CMS preview
- [ ] SEO: metadata API, `app/sitemap.ts`, robots (noindex for demo)
- **Checkpoint:** owner browses home → book → cart → checkout → order

## Phase 8 — Admin upgrade (Angular)

- [ ] Stepwise `ng update` from 12 to latest stable, one major at a time, building after each
- [ ] TSLint → angular-eslint; remove Protractor; Karma → Vitest (today `ng test` runs Karma in watch mode and never
      exits)
- [ ] Standalone components and the new control flow through Angular's own migration schematics (no hand rewrite);
      orders and catalog services typed via `packages/api-client` (pass `validate: true` on `client.admin.users.*`)
- [ ] Demo UX: read-only notice on catalog forms, outbox view, hide Cancel after shipping, show API error messages
      (ship/deliver/cancel show "[object Object]" today)
- [ ] Super-admin catalog editing: image fields keep full Blob URLs (the legacy admin prepends an S3 origin and saves
      only the file name; don't edit catalog records through it until this step), cover and author-photo upload; send
      form values through the `admin…PayloadSchema` so a loaded record can't send `wholeSalePriceHistory` back
- **Checkpoint:** admin logs in, views the catalog, runs an order from confirmed to delivered

## Phase 9 — Tests

- [ ] Storefront: component tests for the cart and the block renderer
- [ ] Admin: tests for the orders service and one key component
- [ ] Playwright E2E, one happy path: browse → add to cart → checkout (Razorpay test) → order visible in admin → ship
      → delivered

## Phase 10 — CI/CD & deployment

- [ ] GitHub Actions: lint, typecheck, test, build via Turbo (affected only) and gitleaks
- [ ] Vercel projects ×4 with root directories, `turbo-ignore`, preview deploys per PR
- [ ] Environment variables per project (test-mode Razorpay, Atlas, Blob, CMS secret, `DEMO_MODE=true`); the API
      needs `PAYMENTS_ADAPTER=razorpay` (test keys + webhook secret) and `STORAGE_ADAPTER=blob`; email, SMS and
      shipping stay `mock`
- [ ] Vercel Cron: weekly demo cleanup
- [ ] Serverless rate limits: let the storefront's server-side requests through (they all arrive from one IP; a
      shared-secret header) and drop slow-down on Vercel (it holds a billed invocation open)
- [ ] DNS for the four `*.demo.pageaters.com` hosts; check the `one_pending_order_per_user` index exists (MongoDB 6.0+)
- **Checkpoint:** all four apps live, E2E passing against the demo

## Phase 11 — Documentation & launch

- [ ] Root README: story (real business, ~10k customers, hand-built 2022–24, re-architected 2026), Mermaid
      architecture diagram, live links, demo logins, screenshots, 3-command local setup
- [ ] `docs/*.md` per AGENTS.md §9
- [ ] ADRs (short): monorepo, Payload CMS & the content/commerce boundary, App Router + Tailwind/shadcn, serverless
      API & adapters, demo-mode sandbox, history preservation
- [ ] Final gitleaks + manual sensitive-data sweep; final look at the `agents/` roster
- [ ] Make the GitHub repo public
- [ ] Archive the decision log to `docs/adr/`, delete PLAN.md

## Dropped for the demo (scope trim 2026-10-31)

Kept as known limitations; none blocks the demo.

- Phase 5: `PAYMENTS_ADAPTER=mock` refused in production, and the storefront's `rzp_test_` key check (the API's
  `rzp_live_` guard already covers live keys); a separate Razorpay step (folded into the Phase 7 checkout); outbox
  cap/TTL and link redaction (only the addressee sees a message, and the weekly cleanup empties it); recording which
  admin issued store credit; demo-specific rate limits (the general limiters stay); "realistic pricing, discounts"
  in sample orders; a separate "tests for every guard" step (each batch tests itself)
- Phase 6: scheduled publish; separate Navigation global (merged into Header); Spacer block and the five banner
  variants as separate blocks; seeding every legacy page layout (homepage + templates only); `cms-engineer` agent
- Phase 7: pixel-matching the original store; translating components no kept block uses; account/profile editing;
  the Google product feed; GA on the demo; the `FeaturedDeals` offset fix (the component is not carried over)
- Phase 8: hand-rewriting components to standalone/control flow; typing every legacy service; validating the admin
  catalog create/update routes with the shared schemas (catalog writes are super-admin only)
- Phase 9: an API coverage report and gap-hunting (985 API tests already); broad admin test coverage
- Phase 10: CodeQL, Vercel Remote Cache, Renovate; a shared rate-limit store (each instance counts on its own, so
  login/code-check limits are per instance); re-encoding uploaded images (uploads are super-admin only); the API
  Dockerfile
- Phase 11: `blocks.md`, `checkout-flow.md` and `seed-data.md` as separate docs (folded into `cms.md`,
  `order-lifecycle.md` and `local-development.md`)
