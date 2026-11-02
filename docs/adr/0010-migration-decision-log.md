# 0010 — Migration decision log

- Status: Accepted
- Date: 2026-11-02

## Context

The 2026 re-architecture ran from a phased checklist, `PLAN.md` (Phases 0–11, 2026-10-25 to 2026-11-02). It is done
and deleted; its last version is in git history: `git show 17c0955:PLAN.md`. Code comments and earlier ADRs that cite
"PLAN.md Phase N" refer to that file. This record keeps its two lasting parts: the decisions and what was left out.

## Decision

Agreed 2026-10-25/26, with the last two added 2026-10-30:

| Topic                | Decision                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo             | Turborepo + pnpm, Node 22 LTS ([0003](./0003-turborepo-monorepo.md))                                                                                                      |
| Hosting              | Everything on Vercel: storefront, admin, CMS and API                                                                                                                      |
| Domains              | `demo.`, `admin.demo.`, `cms.demo.`, `api.demo.pageaters.com`; the root domain is untouched                                                                               |
| Storefront           | Next.js App Router with Tailwind + shadcn/ui ([0005](./0005-next-app-router-tailwind-shadcn.md))                                                                          |
| Backend              | Stays JavaScript (CommonJS), validated by the shared zod schemas, serverless-safe ([0001](./0001-api-stays-javascript.md), [0006](./0006-serverless-api-and-adapters.md)) |
| CMS                  | Payload CMS 3: home and campaign pages, item-page templates, header, footer, theme, SEO ([0004](./0004-payload-cms-content-commerce-boundary.md))                         |
| Code-owned pages     | Cart, checkout, account and sign-in                                                                                                                                       |
| Git history          | Kept for all three repos, scrubbed once of secrets and contact data ([0008](./0008-preserve-git-history.md))                                                              |
| License, name        | All Rights Reserved; the Pageaters brand is kept                                                                                                                          |
| Database             | A new MongoDB Atlas cluster with sanitised data; the old server was destroyed                                                                                             |
| Seed data            | Books-only export (669 books, 313 authors); stock is generated; never committed                                                                                           |
| Images               | Covers from Open Library by ISBN, generated brand artwork for the rest; stored on Vercel Blob                                                                             |
| Payments             | Razorpay test mode only; the API refuses `rzp_live_` keys                                                                                                                 |
| Email, SMS, shipping | Mock adapters with an in-app outbox                                                                                                                                       |
| Demo access, scope   | One-click demo accounts; basic positive paths built well, rare failure cases noted, not built ([0007](./0007-demo-mode-sandbox.md))                                       |
| Credentials          | Every legacy vendor key revoked or rotated; old AWS and Cloudinary accounts closed                                                                                        |
| Store rules          | Store credit is a spent coupon; no cancel after shipping; public lists max 50 items                                                                                       |

## Consequences — known limitations

Left out on purpose; none blocks the demo.

- **Payments and demo:** Razorpay is not in the E2E test (its webhook can't reach localhost; the test pays cash on
  delivery); the outbox has no size cap (the weekly cleanup empties it); who issued store credit is not recorded.
- **API:** rate limits count per serverless instance (no shared store); uploaded images are not re-encoded (uploads
  are super-admin only); no coverage report beyond ~1,000 API tests; no Dockerfile.
- **CMS:** no scheduled publishing; only the home page and templates are seeded, not every legacy page.
- **Storefront:** not pixel-matched to the original store; no profile editing, product feed or analytics on the demo.
- **Admin:** legacy components are upgraded, not rewritten; admin tests are light.
- **CI:** no CodeQL, Renovate or remote cache.
