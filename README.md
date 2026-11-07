# Pageaters

Pageaters was a real online bookstore in India. From 2022 to 2026 it served more than 5,000 customers and handled
more than 50,000 orders: books, book boxes, mystery boxes, bundles, collections and reading plans. Running costs
grew too high and the store closed in 2026.

The original code was written by hand between 2022 and 2024, and that git history is kept. In 2026 the code was
re-architected as this Turborepo monorepo. It now runs as a **sandboxed portfolio demo**. It is not a live store,
and you cannot place real orders, make real payments or get anything delivered.

## What's in the repo

| Path                  | What it is                                                                    |
| --------------------- | ----------------------------------------------------------------------------- |
| `apps/storefront`     | The shop: Next.js App Router, React Server Components, Tailwind, shadcn/ui    |
| `apps/admin`          | Back office for orders, catalog and customers (Angular, standalone + signals) |
| `apps/cms`            | Payload CMS 3: pages, blocks, navigation, SEO                                 |
| `apps/api`            | REST API: Node + Express (JavaScript), Mongoose; runs on Vercel Functions     |
| `packages/shared`     | Domain enums and zod schemas, the single source of truth for contracts        |
| `packages/api-client` | Typed API client that the storefront and admin use                            |
| `packages/cms-types`  | Types generated from the Payload config                                       |
| `packages/config`     | Shared tsconfig, ESLint, Prettier and Tailwind presets                        |
| `seed/`               | Pipeline that sanitises the data and loads the demo catalog once              |

## Architecture

```mermaid
flowchart LR
  shopper([Shopper]) --> SF[Storefront<br/>Next.js]
  staff([Staff]) --> AD[Admin<br/>Angular]
  editor([Editor]) --> CMS[CMS<br/>Payload]
  SF -- "api-client" --> API[API<br/>Express on Vercel Functions]
  AD -- "api-client" --> API
  SF -- "REST, cached by tag" --> CMS
  CMS -- "publish → /api/revalidate" --> SF
  API --> DB[(MongoDB Atlas)]
  CMS --> DB
  API -. adapters .-> EXT[Razorpay test · mock email/SMS/shipping · Vercel Blob]
  SH[[packages/shared<br/>zod contracts]] -.-> SF & AD & API
```

For more, see [`docs/architecture.md`](./docs/architecture.md) and [`docs/business-flows.md`](./docs/business-flows.md).

## Live demo

These links start working once the Phase 10 deployment is done.

| App        | URL                              |
| ---------- | -------------------------------- |
| Storefront | https://demo.pageaters.com       |
| Admin      | https://admin.demo.pageaters.com |
| CMS        | https://cms.demo.pageaters.com   |
| API        | https://api.demo.pageaters.com   |

### Demo logins

- **Storefront:** click **Continue as demo shopper**. This calls `POST /auth/demo-login`, which signs you in to a
  pre-seeded shopper account. There is no signup, OTP or password.
- **Admin:** click **Sign in as demo admin** (`POST /auth/demo-login/admin`). The catalog is read-only, but you can
  run order actions such as confirm, ship, deliver and cancel.
- **CMS:** the login form is already filled in with the read-only editor account (`editor@demo.pageaters.com` /
  `demo-readonly`). This password is public on purpose.

## Screenshots

| Home page                                                 | Book page                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| ![Storefront home](docs/screenshots/storefront-home.webp) | ![Book page](docs/screenshots/book-page.webp)                   |
| **Type-ahead search**                                     | **Collection page, CMS-built banner**                           |
| ![Search](docs/screenshots/search-typeahead.webp)         | ![Collection](docs/screenshots/collection-dark-academia.webp)   |
| **Checkout, cash on delivery or Razorpay test mode**      | **Order details with its history**                              |
| ![Checkout](docs/screenshots/checkout.webp)               | ![Order details](docs/screenshots/order-details-fulfilled.webp) |
| **Admin: dashboard (Angular)**                            | **Admin: shipping an order**                                    |
| ![Admin dashboard](docs/screenshots/admin-dashboard.webp) | ![Admin order](docs/screenshots/admin-order-details.webp)       |
| **CMS: home page built from blocks (Payload)**            | **Admin: book editor**                                          |
| ![CMS home editor](docs/screenshots/cms-home-editor.webp) | ![Admin book editor](docs/screenshots/admin-book-editor.webp)   |

<details>
<summary>More screenshots</summary>

| Page                 | Screenshot                                                        |
| -------------------- | ----------------------------------------------------------------- |
| Category             | ![Romance](docs/screenshots/category-romance.webp)                |
| Category             | ![Non-fiction](docs/screenshots/category-nonfiction.webp)         |
| Author               | ![Author](docs/screenshots/author-page.webp)                      |
| Bundle               | ![Bundle](docs/screenshots/bundle-page.webp)                      |
| Cart                 | ![Cart](docs/screenshots/cart.webp)                               |
| Add an address       | ![Add address](docs/screenshots/checkout-add-address.webp)        |
| Order placed         | ![Order confirmation](docs/screenshots/order-confirmation.webp)   |
| Order just confirmed | ![Order confirmed](docs/screenshots/order-details-confirmed.webp) |
| Orders               | ![Orders](docs/screenshots/orders-list.webp)                      |
| About: our story     | ![About](docs/screenshots/about-story.webp)                       |
| About: us vs them    | ![Us vs them](docs/screenshots/about-us-vs-them.webp)             |
| CMS: pages           | ![CMS pages](docs/screenshots/cms-pages-list.webp)                |

</details>

## Tech stack (and why)

| Choice                            | Why                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Turborepo + pnpm workspaces       | One repo for four apps and their shared contracts, with cached builds that rerun only what changed |
| Next.js App Router, RSC           | Catalog pages render on the server and are cached, which is good for SEO and speed                 |
| Tailwind CSS + shadcn/ui          | Accessible components that live in the repo, with no runtime CSS cost                              |
| Angular (upgraded, not rewritten) | The admin worked and only staff use it, so it was upgraded rather than rebuilt                     |
| Payload CMS 3                     | A CMS that runs on Next.js and uses the same MongoDB. Editors own content; the API owns commerce   |
| Express + Mongoose, JavaScript    | Keeps the proven 2022–24 business logic ([ADR 0001](./docs/adr/0001-api-stays-javascript.md))      |
| Vercel Functions                  | Serverless and scales to zero, which suits a demo with low traffic                                 |
| MongoDB Atlas                     | The original data model, hosted and managed                                                        |
| zod in `@pageaters/shared`        | One schema gives the API validation, the client types and response checks                          |
| Adapters for every vendor         | Mocks are the default, so the demo can never send a real email, SMS or shipment                    |
| Vercel Blob                       | Image storage next to the apps that serve the images                                               |

## Key business decisions

- **Demo mode sandbox:** with `DEMO_MODE=true`, the API and CMS enforce the guards on the server, not only by hiding
  things in the UI ([demo mode](./docs/demo-mode.md)).
- **Store credit works like a coupon:** once you apply it to an order, it is spent. A cancel or refund does not give it back.
- **No cancel after shipping:** you can cancel an order only while it is `paid` or `confirmed`.
- **Razorpay in test mode only:** the API refuses to start if it finds a `rzp_live_` key.
- **Mock email, SMS and shipping:** messages go to an in-app outbox and never reach a typed address or number.
- **Weekly cleanup:** a Vercel Cron job deletes visitor data, puts the stock back and creates fresh sample orders.
- **Public lists return at most 50 rows:** only admins can request bigger pages.

## Local setup

You need Node 22 and pnpm. Copy each app's `.env.example` to `.env` first (`apps/api`, `apps/cms`, `apps/storefront`).

```sh
pnpm install
pnpm seed      # loads the sanitised catalog from seed/data/ (see seed/README.md)
pnpm dev       # runs all four apps through Turborepo
```

`seed/data/` is not committed. You build it locally with the seed pipeline. For details, see
[`docs/local-development.md`](./docs/local-development.md).

## Docs

- [`docs/`](./docs/): [architecture](./docs/architecture.md), [business flows](./docs/business-flows.md),
  [order lifecycle](./docs/order-lifecycle.md), [demo mode](./docs/demo-mode.md), [API](./docs/api.md),
  [CMS](./docs/cms.md), [local development](./docs/local-development.md), [deployment](./docs/deployment.md)
- [`docs/adr/`](./docs/adr/): architecture decision records (0001–0010)

## License

**All Rights Reserved.** This code is published for review only. You may read it to evaluate the author's work;
you may not copy, reuse, redistribute or deploy any part of it, including the Pageaters brand and content.
See [`LICENSE`](./LICENSE).
