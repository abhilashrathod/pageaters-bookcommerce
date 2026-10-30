const crypto = require('crypto');

const { logger } = require('../helpers/logger.helper');

// First middleware of the app: gives every request an ID and a logger, and writes one access log line when the
// response is done.
//
// - `req.id`: the caller's `X-Request-Id` when it is a safe token (8–128 letters, digits, `.`, `_`, `-`), so a proxy's
//   ID can be followed through; anything else is replaced with a random UUID. Echoed as `X-Request-Id`.
// - `req.log`: a child of the app logger bound to `reqId`, for everything logged while handling the request.
// - The access line: method, route pattern, status, duration and request ID. Never the URL itself (a search term or a
//   pincode sits in the path), headers, cookies, bodies or the user.

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * @param {unknown} incoming The `x-request-id` header.
 * @returns {string}
 */
const requestIdFrom = (incoming) => (typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID());

/**
 * Records the pattern of the route that handles the request (`/api/v1/bundles/search/:q`). The router assigns
 * `req.route` when it dispatches to a matched route, while `req.baseUrl` still holds the mount path of every router
 * the request went through; it restores `baseUrl` as the request leaves them, so the pattern is taken at that moment.
 * Router mounts must therefore have no parameters (`router.use('/x/:id', …)` would put the raw value in `baseUrl`).
 * Stays null for a request no route handled (404, static files, errors before routing).
 * @param {import('express').Request} req
 * @returns {{ pattern: string | null }}
 */
const trackRoute = (req) => {
  const matched = { pattern: null };
  let route;
  Object.defineProperty(req, 'route', {
    configurable: true,
    enumerable: true,
    get: () => route,
    set: (value) => {
      route = value;
      if (value) matched.pattern = `${req.baseUrl}${String(value.path)}`;
    },
  });
  return matched;
};

module.exports = (req, res, next) => {
  const started = process.hrtime.bigint();
  req.id = requestIdFrom(req.headers['x-request-id']);
  req.log = logger.child({ reqId: req.id });
  res.set('X-Request-Id', req.id);
  const matched = trackRoute(req);

  res.once('close', () => {
    const entry = {
      method: req.method,
      route: matched.pattern,
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e4) / 100,
    };
    // The client went away before the response was complete.
    if (!res.writableFinished) entry.aborted = true;
    req.log.info(entry, 'request');
  });
  next();
};
