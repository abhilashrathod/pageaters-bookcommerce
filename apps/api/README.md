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
pnpm test              # node --test: HTTP tests on an in-memory MongoDB, vendors stubbed
```

The API `require()`s the built `@pageaters/shared` (its `dist/`). From the repo root, `pnpm turbo run test
--filter=api` (or `pnpm test`) builds it first (`test` depends on `^build`); to run `pnpm --filter api test` or
`pnpm dev` directly, build it once with `pnpm --filter @pageaters/shared build` (again after changing it).

`.env.example` documents every variable with its default and rule, and marks which are required to boot
(`MONGODB_URI`, `ENCRYPTION_KEY`, `RAZORPAY_KEY_ID`).
`ENCRYPTION_KEY` must be exactly 32 bytes; use 32 ASCII characters.
Razorpay test-mode keys only: `RAZORPAY_KEY_ID` must start with `rzp_test_`, and the API refuses to boot with a
live key (`rzp_live_…`). Requires Node 22.9+ for `--env-file-if-exists`.
Valid `APP_ENV` values: `development` | `staging` | `production` | `test`; `production` turns on the legacy
production-only order SMS and e-mails.

### Adapters (e-mail, SMS)

Third-party services sit behind adapters in `src/adapters/` (see its README). Each has a real and a `mock`
implementation, chosen per adapter; **`mock` is the default**, and keeps messages in memory without sending them.

| Variable        | Values                       | Keys required only with the real adapter                 |
| --------------- | ---------------------------- | -------------------------------------------------------- |
| `EMAIL_ADAPTER` | `mock` (default), `sendgrid` | `SENDGRID_API_KEY`, `MAIL_FROM`                          |
| `SMS_ADAPTER`   | `mock` (default), `twilio`   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE` |

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
src/adapters/     third-party services behind real + mock implementations (email, sms)
src/services/     business logic (src/services/README.md)
src/helpers/      pure cross-cutting utilities (errors, encryption, image URLs)
src/libs/         search index, sitemap, Google product feed
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
