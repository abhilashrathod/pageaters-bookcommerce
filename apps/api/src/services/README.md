# Services

Business logic of the API. Layers: `routes → controllers → services → models` (AGENTS.md §5). The worked example is
`favorites.service.js` with `controllers/favorites.controller.js` and `test/favorites.test.js`.

## Rules

- **Name** `<domain>.service.js` (`favorites.service.js`, `order-pricing.service.js`). Split a domain by
  responsibility (pricing, checkout, lifecycle, shipping, notifications…); keep each file under ~300 lines.
- **Plain arguments in, plain data out.** Never take `req`/`res` or read cookies, headers or `req.allParams()` —
  the controller passes `userId`, ids and payload fields. Return data (a Mongoose document or plain object) or
  nothing. Use `.lean()` only where it doesn't change the response (schemas with `toJSON` options or virtuals).
- **Fail by throwing `AppError`** (`helpers/appError.helper.js`): `throw new AppError('BOOK_NOT_EXIST')` (400) or
  `new AppError('ORDER_NOT_FOUND', { status: 404, data })`. `code` is a message key that exists in
  `src/locales/en.json`. Unexpected errors just propagate (they become a 500).
- **Models directly**, via `mongoose.model(models.X)`. No repository layer.
- **Vendor calls only through adapters** (`src/adapters/`, see its README) for e-mail and SMS; the remaining SDK
  calls (Razorpay, Delhivery, S3) live only in services until their adapters (step 6b). E-mail goes through
  `mail.service.js` (`sendTemplateMail`), which renders the template, awaits the send and never throws. Always
  render ejs with an explicit options object (without one, ejs reads compile options from the data), and pass only
  the template's own keys when data comes from a request.
- **JSDoc on every exported function**: what it does, params, return, and which `AppError` codes it throws.
- Services may call other services; never a controller.
- Keep legacy behaviour (status, message key, shape) when moving code; note known legacy bugs in the JSDoc
  rather than fixing them in a layering change.

## Controllers

Thin: read `req.allParams()` / `req.user`, call one service, answer with the `res.*` helpers
(`middlewares/extendReq.middleware.js`), and send every caught error to `handleControllerError`:

```js
module.exports.add = async (req, res) => {
  try {
    const { product } = req.allParams();
    await favoritesService.addFavorite(get(req, 'user.userId', ''), product);
    return res.ok({ message: 'WISH_LIST_ADD_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
```

### Request validation

Routes validate with `validate(schema)` (`middlewares/validate.middleware.js`) and a request schema from
`@pageaters/shared` (`src/requests/*`, admin ones in `src/requests/admin/*`), loaded with `require()`:

```js
const { favoritesRequestPayloadSchema } = require('@pageaters/shared');
router.post('/', validate(favoritesRequestPayloadSchema), permissionValidator(USER_ROLES.USER), controller.add);
```

- It checks `req.allParams()`; query keys the schema doesn't list are ignored (cache-busters), unknown body keys are
  refused by the strict shopper schemas. A failure answers the object-form 400 with the first issue's message as the
  code (`res.error({ message })` shape: `statusCode, status, message, error, data`).
- `req.body` and `req.query` stay as sent. The parsed value is `req.validated`: emails trimmed and lower-cased, text
  trimmed, defaults applied, unknown keys of non-strict schemas dropped. **Passwords are never trimmed** (the schemas
  check the trimmed length but return the value as sent).
- Read `req.validated` where a rule depends on the parsed value — today every route that takes an email (auth,
  subscriber, address create/update) and the pincode check. Other controllers still read `req.allParams()`; moving
  them changes behaviour (e.g. `quantity` defaults) and needs its own pinned test.
- A new rule goes in the shared schema (with a test there), never in the API. Codes must exist in
  `src/locales/en.json`; an issue without a code (unknown keys, enum values, bare checks) answers the fixed `INVALID_REQUEST`, so a 400 never echoes client input or schema text.

`handleControllerError` maps an `AppError` to the legacy envelope: 401 → `res.unauthorized(code)`, 403 →
`res.forbidden()`, 400 without `data` → `res.error(code)`, other 4xx (or `data` given) →
`res.error({ statusCode, message: code, data })`; 5xx and non-`AppError`s → `res.internalServerError(e)`. The
central error handler (Phase 4 step 9) replaces it.

## Where shared code goes

- **Domain logic lives in the service that owns it**, and other services import it from there, following the
  dependency direction below. Checkout prices carts with `calculateTotal` from `cart-pricing.service.js`; the
  Delhivery pincode check lives in `address.service.js`.
- **`helpers/` holds only pure, cross-cutting utilities** with no domain rules and no database or vendor calls:
  `appError`, `encryption`, `utils`, `image-url` (CDN image URLs, also used by `libs/`), the Mongo connection and
  compat helpers. `environment` exposes the legacy production-only gate (`isProduction()`, read per call so
  tests can switch it).
- **`libs/` (sitemap, Google feed, search index) must not import services**; code they share with services goes in a
  helper.
- **Dependency direction:** order → cart → catalog / notifications. No back edges and no lazy-`require` workarounds
  for cycles; move the shared code down a layer instead.

## Rules from the parallel split (4b orders, 4c cart + auth, 4d catalog and the rest)

The split is done (4e folded `order.helper.js` and `cart.helper.js` into services). These rules still apply to later
steps, except the frozen list, which applies only while parallel branches are open.

- **Own your file names.** Each branch creates only services named for its own domains (4b `order-*`, 4c `cart-*` and
  `auth-*`, 4d its catalog domains such as `store-book-*`, `author.service.js`…) and tests named
  `test/<domain>*.test.js`. No generic `payments`, `sms`, `email` or `notifications` services: those names belong to
  the adapters step.
- **Frozen during the split:** `src/app.js`, `middlewares/`, `helpers/` (including `appError.helper.js`), `models/`,
  `libs/`, `src/locales/en.json`, `package.json` (no new dependencies), and `test/helpers/*` except your own
  `test/helpers/fixtures/<domain>.js`. Use only your id range from `fixtures/ids.js`.
- **No transactions.** The test MongoDB is a standalone server and the legacy code uses none.
- **Keep the exact `res.*` call form.** `res.error('KEY')` and `res.error({ message: 'KEY', … })` serialise their
  keys in different orders. Pin envelopes in tests by comparing `JSON.stringify(res.body)`, not `deepEqual`.
- **Object-form 400** (`res.error({ message: 'KEY', data: {} })`) → `new AppError('KEY', { data: {} })`. Any other
  non-standard body stays in the controller unchanged: the cart's `PRODUCT_ITEM_MISMATCH` with custom text,
  plain-text 500s, webhook `res.json({ status: 'ok' })`.
- **Services never set cookies or headers.** Auth services return the token/payload; the controller sets the cookies
  with the same options as today.
- **Message keys:** every `AppError` code must already exist in `src/locales/en.json` (`test/messageKeys.test.js`
  checks literal codes). Don't edit `en.json`.
- **No new env vars, no `console.log` in new service code.** Legacy bugs go in the JSDoc, not fixed.

## Tests

Integration tests run the real app over HTTP on an in-memory MongoDB with fake fixtures and every vendor SDK stubbed
(`test/helpers/`). Write them against the legacy controller first, see them pass, then refactor and keep them green.

- **Require `./helpers` before anything in `src/`.** Its first require applies the test env (mock e-mail and SMS
  adapters), stubs the Razorpay, Twilio, SendGrid, axios (Delhivery) and S3 SDKs, and blocks every non-local
  connection.
- One `startTestApp()` per file (`before`), `api.reset()` in `beforeEach` (empties collections, clears vendor
  mocks and the outbox), `api.stop()` in `after` (it first waits for in-flight database writes the legacy code doesn't await, such
  as res.error's request log, so no fixed delay is needed). `api.request(path, { method, body, cookie })` calls
  `/api/v1/<path>`.
- Generic assertions come from `./helpers` (`test/helpers/assert.js`, `outbox.js`): `envelopes` (legacy `res.*` bodies
  key by key), `assertBody` (JSON-text compare), `assertGuarded`, `paged`, `asJson`/`asCreated`, `eventually`, and
  `sentEmails()` / `sentTexts()` (what the mock adapters were given; sends are awaited, so they are complete when the
  response arrives). Switch the production-only notifications on for one test with
  `t.mock.method(environment, 'isProduction', () => true)` and make an adapter fail with `t.mock.method(sms, 'send', …)`. Domain fixtures stay in
  `test/helpers/fixtures/<domain>.js`.
- Accounts: `createUser({ role })` returns `{ user, cookie }`, made with the app's own hashing and token code.
- Search: the lunr indexes build when the app connects (empty database); `await api.reindex()` after loading
  fixtures in tests that search.
- Vendor calls fail (async SDKs reject with `VendorCallError`) unless mocked for that exact call:
  `mockVendorCall('razorpay.orders.create', async (payload) => ({ id: 'order_test_1' }))`.
  Mocks are cleared by `api.reset()`, so set them inside the test (or in `beforeEach` after `reset()`), never in
  `before()`. `mockVendorCall('axios', fn)` catches every `axios(config)` call (Delhivery), so branch on `config.url`.
- Fixtures: shared catalog in `test/helpers/fixtures/catalog.js` (`loadCatalog()`, `ids`). Each domain adds its own
  `test/helpers/fixtures/<domain>.js` with ids from its range in `fixtures/ids.js` (`fixtureId('orders')(1)`), and
  never edits the shared fixtures. Fake data only: example.com emails, `90000000xx` numbers, "Test …" names.
- Never run with `--test-isolation=none`: each file needs its own process (env and stubs are set per process).
