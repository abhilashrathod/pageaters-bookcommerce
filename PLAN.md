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
| Seed data              | From `pageaters-data-dump` (books-only export: 669 books, 313 authors, 55 bundles, 14 collections, 12 categories, 23 product sets). Strip `wholeSalePriceHistory`; replace `inventory` with generated values. Local dev only, never committed                  |
| Images                 | Book covers from Open Library by ISBN (515/618); author photos from Open Library only on confident name match, else branded initials avatar; collections, bundles, categories and the 4 ISBN-less books get generated brand artwork. All stored on Vercel Blob |
| Payments               | Razorpay **test mode only**; boot guard rejects `rzp_live_` keys in demo                                                                                                                                                                                       |
| Email / SMS / Shipping | Mock adapters; in-app outbox                                                                                                                                                                                                                                   |
| Demo access            | Storefront: one-click demo shopper; cart/address/orders/search only. Admin: catalog read-only, order lifecycle actions allowed. CMS: read-only. Uploads: super-admin only. Seeded once; weekly visitor cleanup                                                 |
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

## Phase 4 — API: TypeScript, architecture, security

- [ ] Convert to TypeScript (ESM, strict); upgrade Express, Mongoose 8, remaining deps
- [ ] `env.ts` with zod; replace `config/*.js`; `.env.example`
- [ ] Split `app.ts` (app setup) from server start; remove seed-on-boot and in-process cron
- [ ] Layering: routes → controllers → services → models. Split `order.controller` (1,609 lines), `auth` (738), `cart` (570), `storeBook` (411) into services
- [ ] Replace Joi with shared zod schemas + `validate()` middleware
- [ ] Adapters: payments (Razorpay + mock), sms, email, shipping (Delhivery + mock), storage (Vercel Blob)
- [ ] Security fixes: single CORS allowlist (remove reflect-any-origin), mount rate limiters, per-route body limits (drop global 100 MB + `multer().any()`), protect `/re-index`, auth audit on every route; ~~remove `POST /admin/banavo` (`adminRegister`), which created an `ADMIN` account with no authentication~~ (removed early on 2026-10-28 at the owner's request; admins come from the seed); move password hashing from a single HMAC-SHA512 to scrypt/argon2 (rehash on next login). Data exposure found in Phase 3: admin `user.controller` `getAll`/`getAllDetails`/`search` return full user documents (hash, salt, OTP, tokens, `razorPayCustId`) — respond through `userSchema`; `search` puts raw `q` into `$regex` (ReDoS/regex injection) — escape it; `update` runs `findOneAndUpdate({})`; admin `order.getById` returns the raw Razorpay payment entity (payer contact, card/bank/VPA) — map through `orderPaymentInfo` and store only the summary; `recoverAccount` returns a session token in the body; `permissionVerification` `req.user` select leaks `contactOtp` and rate-limit stamps. Request contracts to tighten once the API uses them (breaks Joi parity, so deferred): max lengths on tokens, address and gift fields, pin code `^\d{6}$`, raw password length cap (bcrypt-style 72-byte limit). Found in step 2: `POST /orders/create-shipment/:orderId` is guarded only as USER with no owner filter (any shopper can ship any paid order — guard as ADMIN); `POST /public/contactUs` is an unauthenticated mail trigger (remove or guard); `GET /store-books/bulk/export` is unauthenticated and writes to local disk (remove); public `GET /store-books/unique/:id` and admin `/store-books/get/:id` send the whole document incl. `wholeSalePriceHistory`, and create/update accept and store it (project it out, `select: false`, stop reading it); admin `users.search` and `orders.search` put raw `q` into `$regex`; links to the reserved root domain in `stockAlert.controller.js` (`https://pageaters.com/book/…`), `libs/sitemap.js`, `libs/googledata.js` and the email templates → demo domain from config
- [ ] Replace lunr in-memory index with MongoDB text index / Atlas Search; replace sqlite mail queue with direct sends via adapter
- [ ] Central error handler, pino logging, request IDs, `/health`
- [ ] Fix legacy bugs found in Phase 1 cleanup: `add-on.controller` `update` (undefined `id`/`addOnId`) and `getById` (returns undefined `bundles`), `getByProductId` ignores `productId`; `jobs/index.js` undefined `logError`; `STOCK_ALERT` email has only `en.html` but renderer loads `en.ejs`; `auth.controller` `updatePassword` saves the old `password` instead of `newPassword`; list endpoints (e.g. `GET /categories`) return no documents without `page`/`limit` and sort on `undefined` without `sortBy` — add defaults; `category.controller` sorts on `Number('asc')` (NaN); `storeDeal.contoller` passes `offset: parseInt(undefined)` so the deals list returns `page`/`offset`/`pagingCounter` as null; `order.getByUniqueId` calls `orderPaymentInfo(null)` (500) for an order without payment; `deleteAccount`/`recoverAccount` write `deletedAt`/`scheduledForDeletion`, which the user model lacks (recovery can never work); order line totals aren't floored while the cart subtotal is; `issueCredit` has no validator (negative credit); validators: `objectId` never required (`cart/add`, `favorites`, `address/:id`, `order/attempt` accept a missing id), any extra query key (cache-buster) 400s, no validator on `PUT /address/:id`, `order/create-shipment`, `order/return`, `order/cancel`, pincode not 6 digits, email not lower-cased; add-ons grouped endpoint doesn't filter soft-deleted add-ons; seed loads 14 inactive product sets the API never serves; delete the dead `book.model.js`. Found in step 2: add-on `update` (ReferenceError) and `getById` always 500; order analytics (best-selling matches `status` not `orderStatus`, dates compared as strings) always return `[]`; deal `getById` uses author messages and `destroy` doesn't await `save()`; mystery-box `destroy` writes `deactivatedAt` (not in the model); author/collection/bundle/book create and update crash when a list field is missing; `order.controller` defines `retrieve` twice; upload doesn't await `File.create` and returns a storage key, not a URL; renaming a product set regenerates its slug (breaks links); `recoverAccount` reads `scheduledForDeletion` from the JWT so it always answers `ACCOUNT_ALREADY_ACTIVE`; `PUT /addresses/:id` checks existence with an unfiltered `findOne()` and `$set`s every field; `check-pincode` returns the courier's raw record; `orders.create` 500s without `giftOptions`; a return after 7 days answers 200 `ORDER_RETURN_PERIOD_LAPSED`; checkout select misspells `boxed`; cart `add`/`addAddOn` return `true` or the cart; `/cart/empty` clears books only; `addAddOn` has no default quantity; unsubscribing a missing stock alert answers `STOCK_ALERT_EXISTS`; `PUT /auth/me` validates `contactNo` but ignores it; list endpoints without `page` return `page: null`
- [ ] OpenAPI from zod at `/docs`
- [ ] Remove `page.controller` / page & banner models (moved to CMS); move sitemap + Google product feed to storefront
- **Checkpoint:** API runs locally, all routes reachable, typecheck clean

## Phase 5 — Demo mode

- [ ] `DEMO_MODE` flag; server-side write guards per AGENTS.md §6
- [ ] Demo shopper one-click login (no signup/OTP); remove the email-OTP login too, which can sign into any account by email, the demo shopper included
- [ ] Admin catalog read-only; order lifecycle via mock shipping allowed
- [ ] `rzp_live_` boot guard; Razorpay test-mode checkout
- [ ] Mock email/SMS → outbox collection + outbox view
- [ ] Super-admin role exempt from catalog read-only and upload guards (server-side role checks, rate-limited login)
- [ ] Uploads for super-admin only (Vercel Blob); rate limits on public endpoints
- [ ] Sample-order generator: random orders across the lifecycle through the order services (realistic pricing, discounts, stock deduction)
- [ ] Weekly cleanup endpoint (protected, `DEMO_MODE` only): wipe visitor carts/addresses/favourites/orders/outbox, restore their stock, regenerate sample orders
- [ ] Tests for every guard

## Phase 6 — CMS (Payload)

- [ ] `apps/cms` scaffold: Payload 3, MongoDB adapter (separate DB), Vercel Blob storage adapter
- [ ] Collections: Pages, Templates (Product, Collection, Category, Bundle, Book Box), Overrides, Media, Users (roles: admin, demo-readonly); seed the CMS read-only demo user (moved from Phase 2)
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
- [ ] Header/nav/footer/announcement from CMS globals; footer credits "Cover images via Open Library" (their covers guidance)
- [ ] Caching with tags + revalidation route; draft mode for CMS preview
- [ ] SEO: metadata API, sitemap, robots (noindex for demo), product feed
- [ ] Demo banner; move the GA measurement ID to env (owner keeps GA; decide whether the demo uses the old property)
- **Checkpoint:** visual comparison with original store

## Phase 8 — Admin upgrade (Angular)

- [ ] Stepwise `ng update` from 12 to latest stable, one major at a time, building after each
- [ ] Fix devkit/CLI mismatch; TSLint → angular-eslint; remove Protractor; Karma → Jest/Vitest (today `ng test` runs Karma in watch mode and never exits, which hangs root `pnpm test`)
- [ ] Standalone components, new control flow; typed services via `packages/api-client` (pass `validate: true` on `client.admin.users.*` until the API stops sending credentials, and parse form values through the `admin…PayloadSchema` before sending so a loaded record can't send `wholeSalePriceHistory` back)
- [ ] Demo-mode UX: read-only notices on catalog forms; outbox view
- [ ] Super-admin catalog editing: update any record (fix inconsistent or generated data) and upload covers/author photos
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
- [ ] Vercel Cron: weekly demo cleanup
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
