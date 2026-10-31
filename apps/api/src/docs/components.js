const { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, PUBLIC_PAGE_LIMIT } = require('@pageaters/shared');

const messages = require('../locales/en.json');
const { enums } = require('../constants');
const { settings } = require('../middlewares/rateLimit.middleware');

// The parts of the OpenAPI document that are not routes: the overview, tags, the session scheme, the shared headers
// and the error responses. Numbers (limits, page sizes) and messages are read from the code, never retyped.

const SESSION_COOKIE = enums.TOKEN_ID.ACCESS_TOKEN_COOKIE;
const { limits } = settings;

const description = `
The commerce API behind the Pageaters storefront and admin: catalog, search, cart, checkout and orders.

> **Portfolio demo, not a real store.** No real orders, payments or deliveries. E-mail, SMS, shipping, payments and
> storage run through mock adapters; Razorpay runs in test mode only.

### Architecture

- **Express 5 on Vercel Functions**, serverless-safe: no in-process queues, timers or disk writes.
- **Layers:** routes → controllers (parse, call, respond) → services (business logic) → Mongoose models.
- **Contracts** are zod schemas in \`packages/shared\`, used by the API (validation), the typed api-client and
  the frontends. **This document is generated from them** at runtime, and a test fails if a route is missing.
- **Adapters** put e-mail, SMS, payments, shipping and storage behind one interface each, with a real and a mock
  implementation.

### Conventions

- **Envelope.** Success: \`{ statusCode, status, message, data }\`. Errors add \`error\` and answer the HTTP
  status they carry. \`status\` is a **message key** (\`INVALID_EMAIL\`, \`CART_EMPTY\`…), stable for clients and
  tests; \`message\` is its English text.
- **Common error keys:** \`NO_AUTH_HEADER\`, \`INVALID_TOKEN\`, \`INVALID_USER\` (401); \`FORBIDDEN\` (403);
  \`INVALID_REQUEST\`, \`INVALID_PAGING\`, \`SORTING_NOT_ALLOWED\`, \`INVALID_JSON\` (400); \`REQUEST_TOO_LARGE\`
  (413); \`NOT_FOUND\` (404); \`TOO_MANY_REQUESTS\` (429); \`DATABASE_UNAVAILABLE\` (503);
  \`SOME_ERROR_OCCURRED\` (500).
- **Auth.** \`POST /api/v1/auth/login\` sets an HTTP-only session cookie (\`${SESSION_COOKIE}\`). Each operation
  states its role: *public*, any signed-in session, **USER** (shoppers; admins pass too) or **ADMIN**.
- **Paging.** List routes take \`page\` (from 1) and \`limit\` (default ${DEFAULT_PAGE_LIMIT}). Public callers get
  at most **${PUBLIC_PAGE_LIMIT}** rows a page; an ADMIN session up to **${MAX_PAGE_LIMIT}**. Pages are
  mongoose-paginate envelopes: \`docs\`, \`totalDocs\`, \`page\`, \`totalPages\`, \`hasNextPage\`…
- **Request IDs.** Every response carries \`X-Request-Id\` (a safe incoming one is reused), also on its log line.
- **Rate limits** per client IP: ${limits.general} requests a minute overall (slowed down after
  ${limits.slowDownAfter}); failed logins ${limits.login}, e-mail/SMS sends ${limits.messageSend}, failed code
  checks ${limits.codeCheck} and pincode checks ${limits.pincodeCheck} per 15 minutes. Limited routes send
  \`RateLimit\` / \`RateLimit-Policy\` headers and answer 429 \`TOO_MANY_REQUESTS\` past the limit.
`.trim();

// Sidebar order. Admin routes have their own tags, grouped apart from the storefront's.
const TAG_GROUPS = [
  {
    name: 'Storefront',
    tags: [
      'Auth',
      'Catalog',
      'Search',
      'Cart',
      'Checkout & Orders',
      'Addresses',
      'Favourites',
      'Store credit',
      'Stock alerts',
      'Newsletter',
      'Outbox',
    ],
  },
  { name: 'Admin', tags: ['Admin: Catalog', 'Admin: Orders', 'Admin: Customers', 'Admin: Files'] },
  { name: 'Platform', tags: ['Health', 'Webhooks', 'Demo', 'Docs'] },
];

const TAG_DESCRIPTIONS = {
  Auth: 'Accounts and the cookie session: register, log in and out, verify e-mail and phone, profile.',
  Catalog: 'Books, authors, categories, collections, bundles, deals, product sets, mystery boxes and add-ons. Public reads.',
  Search: 'Word-prefix search, at most 10 results, most popular first.',
  Cart: 'The signed-in shopper’s cart. Every write answers `true`; re-read the cart for prices.',
  'Checkout & Orders': 'Checkout (attempt → create → pay), order history, returns and cancellations.',
  Outbox: 'The demo’s in-app outbox: the e-mails and texts the mock adapters sent instead of delivering them.',
  Addresses: 'Delivery addresses and the courier’s PIN code check.',
  'Admin: Catalog': 'Catalog reads and writes for the admin app.',
  'Admin: Orders': 'The order lifecycle: shipments, returns, replacements, cancellations and analytics.',
  'Admin: Customers': 'Customers, carts, subscribers, store credit and stock alerts.',
  Webhooks: 'Called by Razorpay; each verifies `X-Razorpay-Signature` over the raw body. No session.',
  Demo: 'Upkeep of the public demo (DEMO_MODE).',
  Docs: 'This reference and the OpenAPI document it renders.',
};

const tags = TAG_GROUPS.flatMap((group) => group.tags).map((name) => ({
  name,
  ...(TAG_DESCRIPTIONS[name] && { description: TAG_DESCRIPTIONS[name] }),
}));

const headers = {
  'X-Request-Id': {
    description: 'The request’s ID: the caller’s own when it is a safe token (8–128 of `A-Za-z0-9._-`), else a UUID.',
    schema: { type: 'string' },
  },
  RateLimit: { description: 'Requests left in the current window (IETF draft-8 format).', schema: { type: 'string' } },
  'RateLimit-Policy': { description: 'The limit and window that apply.', schema: { type: 'string' } },
};

const requestIdHeader = { 'X-Request-Id': { $ref: '#/components/headers/X-Request-Id' } };

const errorExample = (statusCode, key) => ({
  statusCode,
  status: key,
  message: messages[key],
  error: messages[key],
  data: {},
});

const errorResponse = (description, statusCode, examples, extraHeaders = {}) => ({
  description,
  headers: { ...requestIdHeader, ...extraHeaders },
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiErrorResponse' },
      examples: Object.fromEntries(examples.map((key) => [key, { value: errorExample(statusCode, key) }])),
    },
  },
});

const unauthorized = (key) => ({ ...errorExample(401, key), status: 'UNAUTHORIZED' });

const responses = {
  BadRequest: errorResponse('Invalid input. `status` names the failed rule.', 400, ['INVALID_REQUEST', 'INVALID_PAGING']),
  Unauthorized: {
    ...errorResponse('No valid session.', 401, []),
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorResponse' },
        examples: {
          NO_AUTH_HEADER: { value: unauthorized('NO_AUTH_HEADER') },
          INVALID_TOKEN: { value: unauthorized('INVALID_TOKEN') },
        },
      },
    },
  },
  Forbidden: errorResponse('The session’s role may not use this route.', 403, ['FORBIDDEN']),
  TooManyRequests: errorResponse('Rate limit reached.', 429, ['TOO_MANY_REQUESTS'], {
    RateLimit: { $ref: '#/components/headers/RateLimit' },
    'RateLimit-Policy': { $ref: '#/components/headers/RateLimit-Policy' },
  }),
  ServerError: errorResponse('Unexpected error; nothing about it is sent.', 500, ['SOME_ERROR_OCCURRED']),
  ServiceUnavailable: errorResponse('The database is unreachable.', 503, ['DATABASE_UNAVAILABLE']),
};

const securitySchemes = {
  session: {
    type: 'apiKey',
    in: 'cookie',
    name: SESSION_COOKIE,
    description: 'HTTP-only session cookie set by `POST /api/v1/auth/login` and cleared by `POST /api/v1/auth/logout`.',
  },
};

module.exports = { TAG_GROUPS, description, headers, requestIdHeader, responses, securitySchemes, tags };
