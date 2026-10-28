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
pnpm test              # node --test: env validation and boot smoke tests, no database needed
```

`.env.example` documents every variable with its default and rule, and marks which are required to boot
(`MONGODB_URI`, `ENCRYPTION_KEY`, `RAZORPAY_KEY_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`).
`ENCRYPTION_KEY` must be exactly 32 bytes; use 32 ASCII characters.
Razorpay test-mode keys only: `RAZORPAY_KEY_ID` must start with `rzp_test_`, and the API refuses to boot with a
live key (`rzp_live_…`). Requires Node 22.9+ for `--env-file-if-exists`.
Never set `APP_ENV=production` for a deployed demo: it sends real SMS and order emails to visitor-typed
numbers/addresses (AGENTS.md §6). Valid values: `development` | `staging` | `production` | `test`.

## Structure

```
index.js          entry point
src/app.js        Express app setup and server start
src/routes/       route definitions
src/controllers/  request handlers
src/models/       Mongoose models
src/validators/   Joi request schemas
src/middlewares/  auth, validation, response helpers
src/helpers/      shared logic (orders, mail, encryption)
src/jobs/         scheduled jobs
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
