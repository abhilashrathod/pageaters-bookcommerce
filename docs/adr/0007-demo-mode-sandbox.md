# 0007 — The public deployment is a demo-mode sandbox

- Status: Accepted
- Date: 2026-10-26 (scope rules 2026-10-30)

## Context

The store is closed, but the demo is public: anyone can open `demo.pageaters.com`. Visitors must be able to try the
real flows (browse, cart, checkout, admin order handling) without creating real orders, payments, messages or catalog
changes. The Razorpay account is still used for real money elsewhere.

## Decision

`DEMO_MODE=true` in every deployed environment, enforced server-side (AGENTS.md §6):

- **Boot guards** (`apps/api/src/env.js`): any `rzp_live_` key is refused; email and SMS adapters must be `mock` with
  no vendor keys; `CRON_SECRET` is required.
- **Accounts:** one-click demo shopper and demo admin; signup and OTP login off. The demo admin's catalog writes and
  uploads are refused (`demoAdminReadOnly`), order lifecycle actions are allowed. The CMS demo login is read-only.
  Only the owner's super-admin can edit the catalog or upload.
- **Payments:** Razorpay test mode only. Email/SMS land in an in-app outbox.
- **Weekly cleanup** (`GET /demo/cleanup`, cron secret): deletes visitor data, puts back stock, places four sample
  orders through the order services. The catalog is seeded once and never reloaded.
- **Keep it simple** (2026-10-30): build the basic positive paths well; rare races are known limitations. Store credit
  is a coupon, spent once applied; no cancel after shipping; public lists max 50 items (admin up to 1000,
  `pageLimit.middleware.js`).

## Consequences

- **Tech:** guards live in the API and CMS, not just the UI, and are covered by tests; a misconfigured deploy fails at
  boot instead of charging a card.
- **Business:** reviewers see a working store with no risk to customers, money or the brand, and the scope stays
  sized for a portfolio, not an enterprise product.
- The storefront shows a permanent "Portfolio demo — not a real store" banner (`components/site/demo-banner.tsx`).
