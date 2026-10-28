# AGENTS.md — Pageaters Monorepo

Standing rules for any agent (or human) working in this repository. Read this fully before making changes.
The phased migration plan lives in [`PLAN.md`](./PLAN.md); this file holds the rules that outlive it.

---

## 1. What this project is

Pageaters was a real online bookstore for India (2022–2024, ~10k customers). The business is closed.
This repo is a **portfolio showcase** of its architecture, rebuilt as a Turborepo monorepo and deployed as a
public, sandboxed demo. It is **not** a live store.

- Demo storefront: `https://demo.pageaters.com`
- Admin: `https://admin.demo.pageaters.com`
- CMS: `https://cms.demo.pageaters.com`
- API: `https://api.demo.pageaters.com`
- The root domain `pageaters.com` is reserved for other use. Never point anything at it.
- License: **All Rights Reserved** — code, brand, copy and content are for review only. Never add an
  open-source license, and never remove the LICENSE notice or the in-app demo banner.

The original git history (2022–2024, hand-written before AI coding tools) is preserved on purpose.
Never rewrite, squash or rebase historical commits. The only sanctioned history rewrites are the one-time
scrubs recorded in PLAN.md Phase 1 (secrets; personal and business contact data).

---

## 2. Repository layout

```
pageaters/
├─ apps/
│  ├─ storefront/   Next.js (App Router) + React, Tailwind CSS, shadcn/ui
│  ├─ admin/        Angular (latest stable), standalone components, signals
│  ├─ cms/          Payload CMS 3 (Next.js-native), MongoDB adapter, Vercel Blob storage
│  └─ api/          Node + Express, TypeScript, Mongoose — deployed to Vercel Functions
├─ packages/
│  ├─ shared/       Domain types, enums, zod schemas — the single source of truth for contracts
│  ├─ api-client/   Typed API client used by storefront and admin
│  ├─ cms-types/    Types generated from Payload config (`payload generate:types`)
│  └─ config/       Shared tsconfig, ESLint, Prettier, Tailwind presets
├─ seed/            Seed pipeline; its output `seed/data/` is local and gitignored
├─ docs/            Feature, site and architecture explanations (see §9)
│  └─ adr/          Architecture Decision Records
├─ agents/          Subagent definitions (see §9); `.claude/agents` symlinks here
├─ AGENTS.md        This file
├─ CLAUDE.md        Imports AGENTS.md for Claude Code
├─ PLAN.md          Phased migration plan with checkboxes
├─ LICENSE          All Rights Reserved
├─ turbo.json
└─ pnpm-workspace.yaml
```

---

## 3. Tooling & commands

- Node **22 LTS** (`.nvmrc`), **pnpm** (version pinned via `packageManager`). Never use npm or yarn; never commit another lockfile.
- All tasks run through Turbo from the repo root:

| Command                                      | Purpose                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `pnpm install`                               | Install all workspaces                             |
| `pnpm dev`                                   | Run all apps (or `pnpm dev --filter=storefront`)   |
| `pnpm build`                                 | Build everything (cached)                          |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates — all must pass before a commit      |
| `pnpm test:e2e`                              | Playwright end-to-end suite                        |
| `pnpm seed`                                  | Load `seed/data` into the API MongoDB (idempotent) |

Add new scripts to the relevant `package.json` and register them in `turbo.json`; don't run ad-hoc tooling that others can't reproduce.

---

## 4. Architecture rules (non-negotiable)

1. **Commerce vs content boundary.**
   - Commerce data (books, prices, stock, carts, orders, users) lives **only** in the API's MongoDB and is
     served **only** by `apps/api`.
   - Content and layout (pages, templates, blocks, nav, header, footer, announcement bar, theme tokens, SEO
     defaults) live **only** in Payload (`apps/cms`), in its own database.
   - The CMS **references** commerce records by ID (e.g. a "Product Set row" block stores a set ID). It never
     stores prices, stock, or any value that can drift from the API.
2. **Frontends never talk to MongoDB.** Storefront and admin go through `packages/api-client`; storefront reads
   CMS content through Payload's API.
3. **Contracts come from `packages/shared`.** Request/response types and validation are zod schemas defined
   once there and used by the API (validation), the api-client (types) and frontend forms. Never redefine a
   domain type inside an app.
4. **Third-party services sit behind adapters** (`payments`, `sms`, `email`, `shipping`, `storage`), each with a
   real implementation and a `mock` implementation. Application code depends on the interface, never on a
   vendor SDK directly.
5. **Serverless-safe API.** No long-lived in-process state: no in-memory queues, no local disk writes, no
   `setInterval` jobs, no work at boot beyond connecting to the database. Scheduled work = Vercel Cron hitting
   protected endpoints. Files = Vercel Blob.
6. **Config via environment only**, validated at boot with zod (`env.ts` per app). Every variable is
   documented in that app's `.env.example`. Missing or invalid config fails fast with a clear message.

---

## 5. Per-app conventions

### apps/api

- Layers: `routes → controllers (thin: parse, call, respond) → services (business logic) → models/repositories`.
  Controllers must not contain business logic or touch Mongoose directly.
- Keep files focused; if a file passes ~300 lines, split by responsibility (pricing, payments, shipping, notifications…).
- Validation with zod schemas from `packages/shared`, via a shared `validate()` middleware.
- One central error handler; throw typed `AppError`s, never `res.status(500)` ad hoc.
- Logging with pino (structured, with request ID). No `console.log`.
- OpenAPI spec generated from zod schemas, served at `/docs`.
- Security baseline: CORS allowlist from env (single `cors()` setup), rate limiting mounted, per-route body
  size limits, uploads disabled in demo, helmet, auth on every non-public route.

### apps/storefront

- Next.js App Router. **Server Components by default**; `"use client"` only for interactive leaves (cart
  buttons, forms, carousels).
- Styling: Tailwind CSS + shadcn/ui only. No styled-components, emotion or Mantine. Theme tokens arrive from
  the CMS as CSS variables; components read tokens, never hard-coded brand colours.
- CMS-driven pages render through the **block registry** (`blocks/registry.ts`): block `type` → component.
  Unknown or failing blocks render nothing and log a warning — a CMS mistake must never break a page.
- Each block fetches its own commerce data and is wrapped in `<Suspense>` so blocks stream independently.
- Caching: `fetch` with cache tags; CMS publish and API catalog changes call `revalidateTag`. No `cache: 'no-store'`
  on catalog pages without a written reason.
- Code-owned pages (not CMS-editable): cart, checkout, account/profile, auth.

### apps/admin

- Angular latest stable: standalone components, new control flow, signals where state is local.
- Services return typed `Observable<T>` using `packages/shared` types — never `Observable<any>`.
- ESLint via angular-eslint; tests with Jest or Vitest. No TSLint, Karma or Protractor.

### apps/cms (Payload)

- **Pages** collection: free-form block pages (home, campaign landing pages) addressed by slug.
- **Templates** collection: one per page type — Product, Collection, Category, Bundle, Book Box. Each has
  **locked core blocks** (e.g. product info + buy box) that can be reordered but not removed, plus free blocks.
- **Overrides** collection: optional per-item additions keyed by commerce ID (e.g. a custom hero for one
  collection). Missing override → template only.
- **Globals**: Header, Navigation, Footer, Announcement Bar, Theme tokens, SEO defaults.
- Every block config must have a matching storefront component and a type in `packages/cms-types`.
  Adding a block = Payload block config + storefront component + registry entry + doc in `docs/blocks.md`.
- Drafts, versions and live preview are enabled for Pages, Templates and Overrides.

---

## 6. Demo mode (`DEMO_MODE=true` in all deployed environments)

The public demo is a sandbox. These guards are enforced **server-side in the API/CMS**, not just hidden in the UI.

- **Permanent banner** on every storefront and admin page: "Portfolio demo — not a real store. No real orders,
  payments or deliveries."
- **Storefront**: no signup or OTP. One-click "Continue as demo shopper" logs into a pre-seeded account.
  Allowed writes: cart, addresses, favourites, checkout/orders, search. Nothing else.
- **Admin**: catalog entities (books, authors, categories, collections, bundles, deals, product sets,
  customers) are **read-only** — forms render, saving is rejected with a clear demo message.
  **Order lifecycle actions are allowed** (confirm, ship, deliver, cancel, refund) through mock shipping.
  The demo admin cannot change its password or touch other accounts.
- **Super-admin** (the owner's own account; never shared, never listed in demo logins): exempt from the catalog
  read-only and no-upload guards, so the owner can fix records and upload images (Vercel Blob) on the live demo.
  Its password is set by the owner through local `.env` at seed time. Every guard checks the role **server-side**;
  the login is rate-limited.
- **CMS**: demo login is read-only.
- **No uploads** in demo mode for visitors and the demo admin; only the super-admin can upload.
- **Payments**: Razorpay **test-mode keys only**. The API must refuse to boot when `DEMO_MODE=true` and any
  key starts with `rzp_live_`. This account is used for real money elsewhere — treat this guard as critical.
- **Email/SMS**: mock adapters only; messages go to an in-app outbox view. The demo must never send a message
  to an address or number a visitor typed.
- **Seeded once.** `pnpm seed` loads the final catalog and demo accounts once; the catalog is never reloaded. Stock is
  1–1000 per book (about 5% deliberately out of stock).
- **Weekly cleanup** (Vercel Cron → protected endpoint, `DEMO_MODE=true` only): delete visitor carts, addresses,
  favourites, orders and outbox messages; put back the stock those orders took; generate a fresh set of random sample
  orders across the order lifecycle through the API's own order services. It touches only an explicit list of
  visitor-data collections, never the catalog.
- Rate limiting on all public endpoints.

---

## 7. Security & sensitive data — STOP AND FLAG

If you encounter any of the following, **stop, do not commit it, do not print its value in output, and flag
it to the user immediately** (file path + what kind of data, value redacted):

- Credentials of any kind: API keys, tokens, passwords, connection strings, private keys, webhook secrets.
- Customer or personal data: names, emails, phone numbers, addresses, order details of real people.
- Business-sensitive data: wholesale/supplier prices (`wholeSalePriceHistory`), real inventory, margins,
  supplier details, GST/legal/bank details.
- Real contact details of the business or the owner in templates, copy or config.
- Analytics/tracking IDs belonging to the old production setup (GA, Amplitude, etc.).

Removed integrations — never reintroduce them (code, packages, scripts, config keys or env vars):

- **Amplitude** (analytics) and **Brevo / Sendinblue** (marketing automation tracker). Remove any remnant you find,
  including mentions in privacy-policy copy.

Rules:

- Secrets only in Vercel environment variables or local `.env` (gitignored). Only `.env.example` is committed.
- Env vars are minimal: add one only when running code reads it. Don't carry over legacy config keys for
  services that are removed, mocked or unused.
- Seed data is generated locally into `seed/data/` (gitignored) for development only. It is **never committed** or
  shipped with any app, and it must stay sanitised. The raw dump (`../pageaters-data-dump`) is never copied into the repo.
- A secret scanner (gitleaks) runs in pre-commit and CI. Never bypass it (`--no-verify` is forbidden).
- Never use real user data for tests or fixtures.

---

## 8. Quality bar

- TypeScript `strict` everywhere. No `any` without a justifying comment; no `@ts-ignore` (use `@ts-expect-error`
  with a reason, sparingly).
- Tests are required for money logic and state transitions: cart totals, discounts, order pricing, order
  status lifecycle, auth, demo-mode guards. Prefer meaningful tests over coverage percentage.
- A change is done only when `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- No dead code, commented-out code, or unused dependencies left behind.
- Accessibility: semantic HTML, labelled controls, keyboard-reachable interactions, alt text on images.

### Commits

- Conventional Commits (`feat(storefront): …`, `fix(api): …`, `chore(repo): …`), enforced by commitlint.
- Small, focused commits. One logical change per commit; at least one commit per PLAN.md step.
- Never force-push `main`.

---

## 9. Documentation

- **`docs/*.md`** — explanations of features, the site and the architecture. Keep them current: if a change alters
  behaviour described in a doc, update the doc in the same commit. Expected docs include
  `architecture.md`, `demo-mode.md`, `cms.md`, `blocks.md`, `checkout-flow.md`, `order-lifecycle.md`,
  `deployment.md`, `local-development.md`, `seed-data.md`.
- **`docs/adr/NNNN-title.md`** — one ADR per significant decision (context, decision, consequences). Never edit an
  accepted ADR's decision; supersede it with a new one.
- **`agents/*.md`** — subagent definitions. Each file has YAML frontmatter (`name`, `description` saying when to use
  it, `tools`) followed by the agent's instructions. Subagents must follow this AGENTS.md; their files may narrow
  these rules but never relax them. `.claude/agents` is a symlink to `agents/` so Claude Code loads them.
- **READMEs** — root README for reviewers (what, architecture diagram, live links, demo logins, local setup);
  each app has a short README with its own commands and env vars.

---

## 10. Working with PLAN.md

**How a run is triggered.** The owner starts each run with a short instruction such as
"execute the next step" or "do Phase 2, step 3". With no step named, take the **first unticked checkbox** in
PLAN.md (respecting phase order and checkpoints). Before starting, restate in one line which checkbox you are
executing. If a step needs something only the owner can provide (an account, a repo, a key, a decision), stop
and ask for exactly that — never invent credentials or create accounts. Secrets are entered by the owner into
`.env` / Vercel directly; never ask for them to be pasted into the conversation.

- **Execute one checkbox at a time — never a whole phase in one go.** Phases are large; a checkbox is the unit of work.
  For each checkbox: do only that step → run the relevant gates (lint, typecheck, test, build for affected
  workspaces) → commit → tick the box → report what changed → **stop and wait** for the go-ahead before the next one.
- If a checkbox is itself too big to finish and verify in one focused session, first split it into sub-checkboxes
  in PLAN.md, get them approved, then execute them one at a time the same way.
- Work phases in order; don't start a phase until the previous one's checkpoint passes.
- Tick checkboxes in PLAN.md as steps complete, in the same commit as the work.
- At each **Checkpoint**, stop and report to the user before continuing.
- If a step turns out wrong or impossible, say so and propose a change to PLAN.md — don't silently deviate.

### Subagent workflow

The main session is the **orchestrator**; the subagents in `agents/` do the work. The one-checkbox-at-a-time rule
above still applies — subagents split a checkbox, they don't widen it.

| Agent                                                   | Scope         | Edits                             |
| ------------------------------------------------------- | ------------- | --------------------------------- |
| `api-engineer`, `storefront-engineer`, `admin-engineer` | Their own app | Only `apps/<app>/`                |
| `docs-writer`                                           | Whole repo    | `docs/**`, app/package READMEs    |
| `test-writer`                                           | Whole repo    | Test files and test config only   |
| `lint-fixer`                                            | Whole repo    | Style and formatting, never logic |
| `deploy-engineer`                                       | Whole repo    | CI, Vercel and build config       |
| `code-reviewer`, `security-auditor`                     | Whole repo    | Nothing (read-only)               |

- **Orchestrator owns** `PLAN.md`, `AGENTS.md`, root files, `pnpm-lock.yaml`, merging into `main` and pushing. It
  briefs each subagent with one checkbox (or sub-task), its allowed files and the gates to run.
- **Parallel work** runs in separate git worktrees, one branch per subagent (`<agent>/<short-task>`), so agents never
  share a working tree. Agents commit on their branch with hooks enforced and never push or rewrite history.
- **Before merge**, every branch passes `code-reviewer` (verdict merge) and `security-auditor` (verdict clear).
  The orchestrator then merges, runs the root gates, regenerates the lockfile if needed, ticks PLAN.md and pushes.
- Changes a subagent needs outside its scope go in its report; the orchestrator makes them or briefs the owner agent.
- Deployments to production, domain changes and anything needing an account or secret still stop for the owner.

---

## 11. Never

- Never commit secrets, real customer data, wholesale prices, the raw data dump or the generated seed data.
- Never point anything at `pageaters.com` (root) or use live payment keys.
- Never send real emails/SMS from demo, or let visitors create catalog data or upload files.
- Never rewrite original git history (beyond the Phase 1 scrubs) or force-push `main`.
- Never add an open-source license or remove the demo banner.
- Never bypass hooks, linters, tests or the secret scanner.
