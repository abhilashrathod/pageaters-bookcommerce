# Adapters

Every third-party service sits behind an adapter (AGENTS.md §4.4). Application code requires
`src/adapters/<kind>` and calls the interface; it never requires a vendor SDK.

```
src/adapters/<kind>/
  types.js         the contract: JSDoc @typedefs only
  <vendor>.js      real implementation: exports create(config), throws naming each missing key
  mock.js          in-memory implementation with list() / clear() (payments: create(config) too)
  index.js         exports the implementation <KIND>_ADAPTER selects
src/adapters/recorder.js      the bounded list every mock records into
src/adapters/vendor-error.js  the clean error every real adapter rethrows
```

| Kind       | Selector           | Values                        | Keys the real adapter needs                                              |
| ---------- | ------------------ | ----------------------------- | ------------------------------------------------------------------------ |
| `email`    | `EMAIL_ADAPTER`    | `mock` (default), `sendgrid`  | `SENDGRID_API_KEY`, `MAIL_FROM`                                          |
| `sms`      | `SMS_ADAPTER`      | `mock` (default), `twilio`    | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`                |
| `payments` | `PAYMENTS_ADAPTER` | `mock` (default), `razorpay`  | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`      |
| `shipping` | `SHIPPING_ADAPTER` | `mock` (default), `delhivery` | `DELHIVERY_API_TOKEN` (`DELHIVERY_BASE_URL` defaults to Delhivery staging) |
| `storage`  | `STORAGE_ADAPTER`  | `mock` (default), `blob`      | `BLOB_READ_WRITE_TOKEN`                                                  |

Whenever `RAZORPAY_KEY_ID` is set, whichever payments adapter is selected, `src/env.js` requires `rzp_test_` and refuses a
live `rzp_live_` key (AGENTS.md §6). The demo's Razorpay test-mode checkout (Phase 5) selects `razorpay` with test keys.

## Rules

- **Mock by default.** A real adapter is used only when its selector names it, so a missing or forgotten variable
  never sends anything to an address or number a visitor typed (AGENTS.md §6). `src/env.js` requires a real
  adapter's keys only when it is selected, and reports each missing one by name, never a value.
- **Only the selected implementation loads.** `index.js` requires the vendor file only when selected, and the
  vendor file requires its SDK inside `create()`, so with the mock nothing touches a vendor SDK.
- **Interfaces** (`types.js` in each folder). Every call returns a promise that rejects when the vendor didn't do it;
  callers decide what a failure means, and their JSDoc says so.
  - email: `send({ from, to, subject, html })` — rendered by `services/mail.service.js`, which logs a failure and
    never fails the request.
  - sms: `send({ to, body })` — `to` in E.164 (`+91…`); the sender number is the Twilio adapter's config. The contact
    OTP lets a failure answer 500; the order SMS swallows it.
  - payments: `createOrder({ amount, currency, receipt })` (amount in paise; resolves Razorpay's order, `id` is what
    checkout stores) — checkout answers 500 and leaves the order `attempted`; `verifyWebhookSignature(rawBody,
    signature)` (hex HMAC-SHA256 of the raw body under the webhook secret; false without a signature or a secret) — the webhooks
    then do nothing and still answer ok.
  - shipping: `checkPincode(pincode)` (the courier's record, or undefined when not serviceable) — adding an address
    treats a failure as unserviceable, the public check answers 500; `createShipment({ shipments, pickup_location })`
    (resolves the courier's answer, a refusal included) — 500 and the order stays as it was; `trackingUrl(waybill)`.
    Return pickups make no courier call: the admin enters the shipment id.
  - storage: `put({ pathname, body, contentType })` (public, long cache, never overwrites; resolves `{ url, pathname }`)
    — the upload answers 500 and records nothing.
- **Every real adapter bounds its call time** (10 s: SendGrid `setTimeout`, the Twilio client's `timeout`, Razorpay's
  HTTP client timeout, `AbortSignal.timeout` for Delhivery's `fetch` and Blob's `put`), so a slow vendor can't hold a
  request or a serverless invocation open.
- **Real adapters rethrow a clean error** (`vendorError`): a fixed message (`Email send failed`, `SMS send failed`,
  `Payment order failed`, `Shipping request failed`, `Storage upload failed`) with only the vendor's `code`/`status`.
  Never the vendor's message, body or the original error as `cause`: vendor errors quote recipients, and an HTTP
  client error carries the request (Delhivery's: the token, the buyer's address and phone). Nothing logs a raw vendor
  error or request.
- **No request data reaches a library as options.** Adapters pass the fields they need, by name, never a caller's
  object.
- **Mocks are deterministic and bounded.** Each records a frozen copy of what it was asked before the call resolves,
  into a list that keeps only the newest 50 (`recorder.js`); `list()` returns a copy, `clear()` empties it. They never
  log and never write to disk.
  - email/sms: the message. Tests read them through `test/helpers/outbox.js`. Phase 5 replaces the list with the
    outbox collection behind the in-app outbox view.
  - payments: the created order. Ids are `order_mock` + 14 hex characters of HMAC-SHA256(per-process random salt,
    `<receipt>:<n>`) (n counts the instance's orders), so an id can't be derived from a receipt; placing an order again
    gives a new one. Webhook signatures use Razorpay's scheme over `RAZORPAY_WEBHOOK_SECRET` (`payments/signature.js`,
    constant-time, shared with the real adapter); without a secret nothing verifies. `src/env.js` requires the secret
    when `APP_ENV` is `staging` or `production`, with either adapter.
  - shipping: each pincode check and shipment. Every well-formed pincode (6 digits, not starting with 0) is
    serviceable except `999000` and `999999`; shipments always succeed with a waybill `MOCK` + 10 digits; tracking
    links use the reserved host `tracking.shipping.mock.invalid`.
  - storage: path, content type, size and sha256 (not the bytes); URLs on the reserved host `storage.mock.invalid`.
- **Serverless-safe:** sends are awaited inside the request; nothing is queued in process.
- **Tests:** each real adapter has unit tests against a fake SDK module through `require.cache`, or a fake `fetch`
  for Delhivery (call shape, timeout, clean errors, missing keys): `test/adapters.test.js` (email, SMS, and selection
  in a child process) and `test/adapters-<kind>.test.js`. Integration tests run on the mocks (the test env selects
  every one) and simulate a vendor failure with `t.mock.method(adapter, 'method', …)`.
