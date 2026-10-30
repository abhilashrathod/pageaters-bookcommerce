# Adapters

Every third-party service sits behind an adapter (AGENTS.md §4.4). Application code requires
`src/adapters/<kind>` and calls the interface; it never requires a vendor SDK.

```
src/adapters/<kind>/
  types.js         the contract: JSDoc @typedefs only
  <vendor>.js      real implementation: exports create(config), throws naming each missing key
  mock.js          in-memory implementation with list() / clear()
  index.js         exports the implementation <KIND>_ADAPTER selects
src/adapters/recorder.js      the bounded list every mock records into
src/adapters/vendor-error.js  the clean error every real adapter rethrows
```

| Kind    | Selector        | Values                       | Keys the real adapter needs                               |
| ------- | --------------- | ---------------------------- | --------------------------------------------------------- |
| `email` | `EMAIL_ADAPTER` | `mock` (default), `sendgrid` | `SENDGRID_API_KEY`, `MAIL_FROM`                           |
| `sms`   | `SMS_ADAPTER`   | `mock` (default), `twilio`   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE` |

Payments, shipping and storage follow in Phase 4 step 6b.

## Rules

- **Mock by default.** A real adapter is used only when its selector names it, so a missing or forgotten variable
  never sends anything to an address or number a visitor typed (AGENTS.md §6). `src/env.js` requires a real
  adapter's keys only when it is selected, and reports each missing one by name, never a value.
- **Only the selected implementation loads.** `index.js` requires the vendor file only when selected, and the
  vendor file requires its SDK inside `create()`, so with the mock nothing touches a vendor SDK.
- **Interface:** `send(message)` returns a promise that resolves when the message was accepted and rejects
  otherwise. Callers decide what a failure means (`services/mail.service.js` logs it and never fails the request;
  the contact OTP lets it fail the request).
  - email: `send({ from, to, subject, html })` — rendered by `services/mail.service.js`.
  - sms: `send({ to, body })` — `to` in E.164 (`+91…`); the sender number is the Twilio adapter's config.
- **Every real adapter bounds its call time** (10 s: SendGrid `setTimeout`, the Twilio client's `timeout`), so a
  slow vendor can't hold a request or a serverless invocation open.
- **Real adapters rethrow a clean error** (`vendorError`): a fixed message (`Email send failed`, `SMS send failed`)
  with only the vendor's `code`/`status`. Never the vendor's message or the original error as `cause`: vendor
  messages quote recipients.
- **Mocks must be bounded.** Each records a frozen copy of the message before `send` resolves, into a list that keeps
  only the newest 50 (`recorder.js`); `list()` returns a copy, `clear()` empties it. They never log a recipient or a
  body. Tests read them through `test/helpers/outbox.js`. Phase 5 replaces the list with the outbox collection behind
  the in-app outbox view.
- **Serverless-safe:** sends are awaited inside the request; nothing is queued in process.
- **Tests:** each real adapter has unit tests against a fake SDK module (call shape, timeout, clean errors, missing
  keys) in `test/adapters.test.js`; integration tests run on the mocks.
