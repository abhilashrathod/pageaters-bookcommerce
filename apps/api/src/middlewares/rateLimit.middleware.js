const { rateLimit, MemoryStore } = require('express-rate-limit');
const { slowDown } = require('express-slow-down');

// Rate limiting (AGENTS.md §5, §6): one general limit (with a slow-down before it) for every request, and stricter
// named limits on the routes that cost something per call — login, the e-mail/SMS sends, the one-time-code checks
// and the public pincode check (each check spends the courier's API quota).
//
// Store: express-rate-limit's in-memory store, one per limiter, counted per client IP (`req.ip`; `trust proxy` is
// set in app.js). It is per process: serverless instances don't share it, so on Vercel each warm instance counts on
// its own and a limit holds per instance, not across the deployment. A shared store is a Phase 10 decision.
//
// The settings below are the app's own config. The limiters are always on; only the test harness
// (test/helpers/app.js) switches them off through `settings.enabled`, so the integration suites (which send every
// request from 127.0.0.1) can't trip them. test/security-perimeter.test.js switches them back on and may lower a
// limit for one test through `settings` (limits are read per request; windows are fixed).

const MINUTE = 60 * 1000;

const settings = {
  enabled: true,
  limits: {
    // Every request from one IP (legacy values: 150 a minute, slowed by 500 ms per request after 125).
    general: 150,
    slowDownAfter: 125,
    // Failed logins only (a successful login doesn't count).
    login: 10,
    // Demo shopper logins (each one stores a session).
    demoLogin: 20,
    // E-mail/SMS sends: register, verification and reset e-mail (re)sends, contact OTP (re)sends.
    messageSend: 5,
    // Failed one-time-code checks: verify e-mail, reset password, contact OTP verify.
    codeCheck: 10,
    // Public courier serviceability checks.
    pincodeCheck: 30,
  },
};

const WINDOWS = {
  general: MINUTE,
  login: 15 * MINUTE,
  messageSend: 15 * MINUTE,
  demoLogin: 15 * MINUTE,
  codeCheck: 15 * MINUTE,
  pincodeCheck: 15 * MINUTE,
};

const stores = {};

const skip = () => !settings.enabled;

// The legacy envelope shape (like res.forbidden), sent directly: res.error would log the request, params included
// (a password on login).
const tooManyRequests = (req, res) =>
  res.status(429).send({
    statusCode: 429,
    status: 'TOO_MANY_REQUESTS',
    message: res.__('TOO_MANY_REQUESTS'),
    data: {},
    error: res.__('TOO_MANY_REQUESTS'),
  });

const limiter = (name, { onlyFailures = false } = {}) => {
  stores[name] = new MemoryStore();
  return rateLimit({
    windowMs: WINDOWS[name],
    limit: () => settings.limits[name],
    standardHeaders: 'draft-8',
    identifier: name,
    legacyHeaders: false,
    skipSuccessfulRequests: onlyFailures,
    store: stores[name],
    skip,
    handler: tooManyRequests,
  });
};

stores.slowDown = new MemoryStore();

/**
 * Named limiters. `general` is mounted on the whole app (app.js); the others on their routes.
 * @type {Record<'general' | 'slowDown' | 'login' | 'demoLogin' | 'messageSend' | 'codeCheck' | 'pincodeCheck', import('express').RequestHandler>}
 */
const limiters = {
  general: limiter('general'),
  // +500 ms per request over the threshold (express-slow-down v1 behaviour).
  slowDown: slowDown({
    windowMs: WINDOWS.general,
    delayAfter: () => settings.limits.slowDownAfter,
    delayMs: (used, req) => (used - req.slowDown.limit) * 500,
    store: stores.slowDown,
    skip,
  }),
  login: limiter('login', { onlyFailures: true }),
  demoLogin: limiter('demoLogin'),
  messageSend: limiter('messageSend'),
  codeCheck: limiter('codeCheck', { onlyFailures: true }),
  pincodeCheck: limiter('pincodeCheck'),
};

/** Clears every limiter's counts (tests). */
const resetRateLimits = () => Object.values(stores).forEach((store) => store.resetAll());

module.exports = { limiters, settings, resetRateLimits };
