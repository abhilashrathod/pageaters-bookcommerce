# API reference (`/docs`)

The API serves its own reference: `https://api.demo.pageaters.com/docs` (locally `http://localhost:5005/docs`).

## What `/docs` shows

An interactive [Scalar API Reference](https://github.com/scalar/scalar) page for `GET /openapi.json`, an
OpenAPI 3.1 document of every route the API mounts:

- **Overview**: the architecture (layers, contracts, adapters), the demo note, and the conventions every route
  shares: the response envelope, message-key error codes, the cookie session, paging limits, `X-Request-Id` and
  rate limits.
- **Operations** grouped by area: Storefront (Auth, Catalog, Search, Cart, Checkout & Orders, Addresses,
  Favourites, Store credit, Stock alerts, Newsletter), Admin (Catalog, Orders, Customers, Files) and Platform
  (Health, Webhooks, Docs).
- Per operation: the role it needs (public, any session, USER or ADMIN), its parameters and body, its success
  envelope with the `data` schema, and the common error responses (400, 401, 403, 429, 500, 503) with examples.
- **Models**: the shared entities (`Book`, `PopulatedCart`, `AdminOrder`…) as reusable schemas.
- A "Test request" client; it calls the same API, so it works against the demo's public routes.

## How the spec is generated

Nothing in the document is a second copy of a contract:

1. `apps/api/src/docs/routes/` is the route registry: one entry per mounted route (method, path, tag, summary,
   auth, the shared request and response schemas), split by area.
2. `src/docs/build.js` turns it into OpenAPI with zod 4's own `z.toJSONSchema` (no extra library). Every zod schema
   `@pageaters/shared` exports becomes a component named after its export (`bookDetailResponseSchema` →
   `BookDetailResponse`), so shared entities are `$ref`s; components no route uses are dropped. Request schemas are
   inlined as their input type, and a `validate()` schema's keys are split into path, query and body parts.
3. `src/docs/components.js` holds the overview, tags, the cookie security scheme and the error responses; limits
   and messages are read from the code (`rateLimit.middleware.js`, `PUBLIC_PAGE_LIMIT`, `locales/en.json`).
4. The document is built on the first request to `/openapi.json` and kept for the instance's life: no boot work and
   no files written.

`/docs` loads Scalar from a pinned jsDelivr URL with Subresource Integrity, and sends its own Content Security Policy
(that script, its one inline init script by hash, Scalar's fonts, `connect-src 'self'`); every other route keeps
helmet's default policy.

## Adding a route

1. Mount the route as usual (`src/routes/…`), validating with a schema from `@pageaters/shared`.
2. Add an entry to the matching file in `src/docs/routes/` with its `request` (the `validate()` schema) and
   `response` (the shared `…ResponseSchema`). The entry format is described at the top of `src/docs/build.js`.
3. Run `pnpm --filter api test`. `test/openapi.test.js` walks the Express router stack and fails when a mounted
   route is missing from the document or a documented route is not mounted, and checks the document against the
   OpenAPI 3.1 schema.

A response schema must be exported by `@pageaters/shared`; add it there first if it is new.
