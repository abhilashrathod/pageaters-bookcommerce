const assert = require('node:assert/strict');

const t = require('../../src/locales/en.json');

// Generic assertions and response builders for the HTTP tests. Envelopes are pinned byte for byte: the legacy res.*
// helpers (middlewares/extendReq.middleware.js) write their keys in different orders, so bodies are compared as JSON
// text (assertBody), never with deepEqual.

// Envelopes, written key by key as extendReq.middleware.js writes them.
const envelopes = {
  // res.ok({ message, data }).
  ok: (status, data = {}) => ({ statusCode: 200, status, message: t[status], data }),
  // res.ok('KEY') (string form): `data` before `message`.
  okString: (status) => ({ statusCode: 200, status, data: {}, message: t[status] }),
  created: (message, data = {}) => ({ statusCode: 201, data, message: t[message] }),
  // res.error('KEY'): `error` before `message`.
  badRequest: (status) => ({ statusCode: 400, status, error: t[status], message: t[status], data: {} }),
  // res.error({ message, data }) and Joi failures: `message` before `error`.
  badRequestObject: (status, data = {}) => ({ statusCode: 400, status, message: t[status], error: t[status], data }),
  serverError: { statusCode: 500, status: 'SOME_ERROR_OCCURRED', message: t.SOME_ERROR_OCCURRED, error: t.SOME_ERROR_OCCURRED, data: {} },
  unauthorized: (key) => ({ statusCode: 401, status: 'UNAUTHORIZED', message: t[key], data: {}, error: t[key] }),
  forbidden: { statusCode: 403, status: 'FORBIDDEN', message: t.FORBIDDEN, data: {}, error: t.FORBIDDEN },
};

/** Asserts status and body; the body is compared as JSON text, so key order counts. */
const assertBody = (res, status, body) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(JSON.stringify(res.body), JSON.stringify(body));
};

/** A document as the API serialises it (toJSON, then through JSON). */
const asJson = (doc) => JSON.parse(JSON.stringify(doc));

/** A document as `Model.create()` returns it: its fields serialise before `_id`, then timestamps and `__v`. */
const asCreated = (doc) => {
  const { _id, createdAt, updatedAt, __v, ...fields } = asJson(doc);
  return { ...fields, _id, createdAt, updatedAt, __v };
};

/**
 * Polls `check` until it returns a truthy value or the timeout passes, and returns its last value (for writes the
 * legacy code doesn't await, which land after the response).
 * @template T
 * @param {() => Promise<T>} check
 * @param {{ timeout?: number, interval?: number }} [options]
 * @returns {Promise<T>}
 */
const eventually = async (check, { timeout = 2000, interval = 10 } = {}) => {
  const end = Date.now() + timeout;
  for (;;) {
    const value = await check();
    if (value || Date.now() > end) return value;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Checks the auth guard of a route: no session → 401 NO_AUTH_HEADER, bad token → 401 INVALID_TOKEN and, for ADMIN
 * routes, a USER session → 403.
 * @param {Awaited<ReturnType<typeof import('./app').startTestApp>>} api
 * @param {[string, string, unknown?]} route method, path, body
 * @param {{ admin?: boolean, userCookie?: string }} options
 */
const assertGuarded = async (api, [method, path, body], { admin = false, userCookie } = {}) => {
  assertBody(await api.request(path, { method, body }), 401, envelopes.unauthorized('NO_AUTH_HEADER'));
  assertBody(await api.request(path, { method, body, cookie: '_PID=not-a-jwt' }), 401, envelopes.unauthorized('INVALID_TOKEN'));
  if (admin) assertBody(await api.request(path, { method, body, cookie: userCookie }), 403, envelopes.forbidden);
};

/** The paginate envelope (mongoose-paginate-v2) for a page of `docs`. */
const paged = (docs, fields) => ({
  docs,
  totalDocs: fields.totalDocs,
  limit: fields.limit,
  totalPages: fields.totalPages,
  page: fields.page,
  pagingCounter: fields.pagingCounter,
  hasPrevPage: fields.hasPrevPage,
  hasNextPage: fields.hasNextPage,
  prevPage: fields.prevPage,
  nextPage: fields.nextPage,
});

module.exports = { asCreated, asJson, assertBody, assertGuarded, envelopes, eventually, paged };
