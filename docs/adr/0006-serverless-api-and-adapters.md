# 0006 — Serverless-safe Express API with vendor adapters

- Status: Accepted
- Date: 2026-10-26

## Context

The original API ran as a long-lived Express server: in-memory search indexes, an in-process mail queue, and vendor
SDKs (Razorpay, SendGrid, Twilio, Delhivery, AWS) called directly. For the demo everything is hosted on Vercel (PLAN.md
decision log), and the vendor accounts were closed or rotated, so the API must run as functions and must not send real
messages or bookings.

## Decision

- **Express on Vercel Functions.** `src/app.js` only builds and exports the app; `src/server.js` is the local entry
  that connects and listens. No in-process state, disk writes or timers (AGENTS.md §4.5); scheduled work is Vercel
  Cron calling protected endpoints; files go to Vercel Blob.
- **Adapters** for payments (Razorpay), email (SendGrid), SMS (Twilio), shipping (Delhivery) and storage (Vercel
  Blob) in `apps/api/src/adapters/<kind>/`: a JSDoc contract, a real and a `mock` implementation, chosen by
  `<KIND>_ADAPTER`. **Mock is the default**; application code never requires a vendor SDK.
- Config is read and validated with zod only in `src/env.js`; a real adapter's keys are required only when selected.

## Consequences

- **Tech:** the same code runs locally, in tests (on the mocks) and on Vercel; vendors can be swapped per adapter.
  Per-instance limits remain (each function counts rate limits on its own; noted in PLAN.md as a known limit).
- **Business:** a closed store has no budget for always-on servers or live vendor accounts. Free-tier serverless
  hosting and mocks keep the demo cheap, and nothing a visitor types can reach a real inbox, phone or courier.
- Deployed demo: `PAYMENTS_ADAPTER=razorpay` with test keys and `STORAGE_ADAPTER=blob`; email, SMS and shipping stay
  `mock` (ADR 0007). The Vercel deployment itself is Phase 10.
