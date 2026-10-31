# api

Pageaters REST API — Node 22 + Express 5 + MongoDB (Mongoose 8).

JavaScript (CommonJS); it stays JavaScript (see `docs/adr/0001-api-stays-javascript.md`).

## Setup

Configuration comes from environment variables only, validated with zod at boot in `src/env.js`
(`src/appConfig.js` maps the result to the shape the app imports). Invalid or missing config stops the server
with one message naming each bad variable and the rule it breaks, never its value.

```sh
cp .env.example .env   # then fill in the values
pnpm dev               # node --watch, loads .env if present
pnpm start             # same without watch
pnpm lint              # ESLint (flat config on @pageaters/config/eslint/node)
pnpm test              # node --test: HTTP tests on an in-memory MongoDB, mock adapters, vendors stubbed
```

The API `require()`s the built `@pageaters/shared` (its `dist/`). From the repo root, `pnpm turbo run test
--filter=api` (or `pnpm test`) builds it first (`test` depends on `^build`); to run `pnpm --filter api test` or
`pnpm dev` directly, build it once with `pnpm --filter @pageaters/shared build` (again after changing it).

`.env.example` documents every variable with its default and rule, and marks which are required to boot
(`MONGODB_URI`, `ENCRYPTION_KEY`; a real adapter's keys when it is selected).
`ENCRYPTION_KEY` must be exactly 32 bytes; use 32 ASCII characters.
Razorpay test-mode keys only: whenever `RAZORPAY_KEY_ID` is set (with either payments adapter) it must start with
`rzp_test_`, and the API refuses to boot with a live key (`rzp_live_…`). Requires Node 22.9+ for
`--env-file-if-exists`.
Valid `APP_ENV` values: `development` | `staging` | `production` | `test`; `production` turns on the legacy
production-only order SMS and e-mails.

### Adapters (e-mail, SMS, payments, shipping, storage)

Third-party services sit behind adapters in `src/adapters/` (see its README). Each has a real and a `mock`
implementation, chosen per adapter; **`mock` is the default**, and keeps what it was asked in memory without
calling the vendor.

| Variable           | Values                        | Keys required only with the real adapter                            |
| ------------------ | ----------------------------- | ------------------------------------------------------------------- |
| `EMAIL_ADAPTER`    | `mock` (default), `sendgrid`  | `SENDGRID_API_KEY`, `MAIL_FROM`                                     |
| `SMS_ADAPTER`      | `mock` (default), `twilio`    | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`           |
| `PAYMENTS_ADAPTER` | `mock` (default), `razorpay`  | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| `SHIPPING_ADAPTER` | `mock` (default), `delhivery` | `DELHIVERY_API_TOKEN` (`DELHIVERY_BASE_URL` defaults to staging)    |
| `STORAGE_ADAPTER`  | `mock` (default), `blob`      | `BLOB_READ_WRITE_TOKEN` (the same Vercel Blob store as the seed)    |

The mock payments adapter creates fake order ids and checks webhook signatures with Razorpay's scheme over
`RAZORPAY_WEBHOOK_SECRET`, so with a secret set checkout → webhook → paid works locally. Without a secret no webhook
verifies (with either adapter), and `RAZORPAY_WEBHOOK_SECRET` is required whenever `APP_ENV` is `staging` or
`production`. The demo's Razorpay test-mode checkout selects `razorpay` with test keys. The mock courier delivers to every well-formed
pincode except `999000` and `999999`. Admin uploads answer the file's public URL (`uploads/<module>/…` in Blob);
catalog image fields hold full URLs; `src/helpers/image-url.helper.js` passes https URLs through and gives '' for
anything else.

Never select a real e-mail or SMS adapter for the deployed demo: it would message the addresses and numbers
visitors type (AGENTS.md §6). E-mails are rendered from `src/templates/email/` by `src/services/mail.service.js`
and sent before the request answers (no in-process queue).

## Structure

```
src/app.js        builds and exports the Express app (no listen, no connect; serverless-importable)
src/server.js     local entry: validates env, connects to MongoDB, listens on PORT
src/routes/       route definitions
src/controllers/  request handlers
src/models/       Mongoose models
src/middlewares/  auth, validation, response helpers
src/adapters/     third-party services behind real + mock implementations (email, sms, payments, shipping, storage)
src/services/     business logic (src/services/README.md)
src/helpers/      pure cross-cutting utilities (errors, logger, encryption, image URLs)
src/templates/    email templates (EJS)
src/notes/        domain notes on orders, payments and refunds
```

## Logging, errors and health

- Logs are pino JSON lines on stdout (`src/helpers/logger.helper.js`); `LOG_LEVEL` sets the level (default debug
  locally, info deployed, silent in tests). Passwords, one-time codes, tokens, secrets, cookies, Authorization
  headers, signatures, sessions and contact details (e-mail, phone, address) are redacted at any depth, Mongoose
  documents included; errors are logged by name, code, status and stack frames, not their message.
- Every request gets an ID (`req.id`, the `X-Request-Id` response header; a safe incoming `X-Request-Id` is reused), a
  child logger `req.log` and one access line (method, route pattern such as `/api/v1/bundles/search/:q` or `null`
  when no route handled it, status, duration; never the URL itself, the body or cookies).
- One error handler (`src/middlewares/errorHandler.middleware.js`) answers whatever reaches `next(error)` in the
  envelope below, through the same mapping as the controllers' `handleControllerError`: unmatched routes 404
  `NOT_FOUND`, malformed JSON 400 `INVALID_JSON`, a body over 100 kb 413 `REQUEST_TOO_LARGE`, any other client error
  (e.g. malformed percent-encoding in the path) its 4xx `INVALID_REQUEST`, the database unreachable 503
  `DATABASE_UNAVAILABLE`, anything unexpected 500 `SOME_ERROR_OCCURRED`.
- `GET /health` (public, rate-limited like everything else) waits up to 2.5 s for the shared MongoDB connection (a
  cold instance connects, as its first database-backed request would) and pings it within 1 s: `{ "status": "ok" }`
  when both succeed, else 503 `{ "status": "unavailable" }`, never the reason.

## API reference

`GET /docs` is an interactive reference (Scalar) for `GET /openapi.json`, an OpenAPI 3.1 document generated from
the zod schemas in `@pageaters/shared` through the route registry in `src/docs/routes/`. Adding a route means adding
its registry entry; `test/openapi.test.js` fails otherwise. See `docs/api.md`.

## Response format

```js
{
  "statusCode": 200, // Matches the HTTP response status code sent
  "code": "REGISTRATION_SUCCESS", // Codes defined for success and failure. Useful for tests
  "message": "Registration Success", // Translated messages
  "data": {} // Any data that is to be returned by API
}
```
