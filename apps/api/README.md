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
src/helpers/      pure cross-cutting utilities (errors, encryption, image URLs)
src/libs/         sitemap, Google product feed
src/templates/    email templates (EJS)
src/notes/        domain notes on orders, payments and refunds
```

## Response format

```js
{
  "statusCode": 200, // Matches the HTTP response status code sent
  "code": "REGISTRATION_SUCCESS", // Codes defined for success and failure. Useful for tests
  "message": "Registration Success", // Translated messages
  "data": {} // Any data that is to be returned by API
}
```
