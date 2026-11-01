# 0004 — Payload CMS owns content; the API owns commerce

- Status: Accepted
- Date: 2026-10-26

## Context

In the original store, page layouts and banners lived in the API's database next to books and orders, and changing
the homepage meant code or admin work. A store needs non-developers to change pages and campaigns, but must never let
page content disagree with real prices or stock.

## Decision

Add **Payload CMS 3** as `apps/cms` (Next.js-native, MongoDB adapter, its own `pageaters_cms` database) and draw a hard
line (AGENTS.md §4.1):

- **CMS owns content and layout:** Pages (free-form block pages), Templates (one per page type, with locked core
  blocks), Overrides (per-item additions keyed by commerce ID), and the Header, Footer, Announcement Bar, Theme and SEO
  globals (`apps/cms/src/collections`, `apps/cms/src/globals`).
- **API owns commerce:** books, prices, stock, carts, orders and users stay only in the API's MongoDB.
- The CMS **references** commerce records by ID (for example a product set); it never stores a price or stock value.
- The storefront renders CMS blocks through a block registry; each block fetches its own commerce data from the API.

## Consequences

- **Tech:** two databases and two APIs, but no value can drift between them; a CMS mistake renders nothing rather
  than a wrong price. Block types are generated into `packages/cms-types`.
- **Business:** merchandising (homepage, campaigns, theme) can change without a deploy, while money and stock keep
  one source of truth — the split a real bookstore needs, shown at demo scale.
- The legacy page/banner models were removed from the API. On the demo the CMS login is read-only
  (`demo-readonly` role); only the owner's admin account writes.
