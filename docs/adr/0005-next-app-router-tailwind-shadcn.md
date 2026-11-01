# 0005 — Storefront rebuilt on Next.js App Router, Tailwind and shadcn/ui

- Status: Accepted
- Date: 2026-10-26

## Context

The original storefront was a Next.js Pages Router app styled with styled-components (last legacy state in git at
`117c451`). It had no way to render CMS-driven pages, pulled data per page in `getStaticPaths`/props, and its styling
hard-coded brand colours. Upgrading it in place would have meant migrating every page to the App Router and every
component off styled-components anyway, while also adding the CMS block model (ADR 0004).

## Decision

Rebuild the storefront in place (`apps/storefront`) on the **App Router** (Next 16.4, React 19.2) with **Tailwind CSS
4 + shadcn/ui** only (PLAN.md decision log; AGENTS.md §5).

- Server Components by default; `"use client"` only for interactive leaves (cart buttons, forms).
- CMS pages render through the block registry; each block fetches its own data inside `<Suspense>`.
- Theme tokens come from the CMS Theme global as CSS variables; components never hard-code brand colours.
- Caching via `fetch` cache tags, revalidated when the CMS publishes.
- Cart, checkout, account and auth stay code-owned pages.
- Components were kept close to the original look, not pixel-matched (scope trim, 2026-10-31).

## Consequences

- **Tech:** less client JavaScript, streamed blocks, and one styling system; the old components are not reused.
- **Business:** the demo keeps the Pageaters brand and feel while showing a current React stack — a rebuild costs
  about the same as a full upgrade here and leaves no legacy styling to maintain.
- The legacy app remains readable in git history for comparison.
