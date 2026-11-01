const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const i18n = require('i18n');
const helmet = require('helmet');

const { PROJECT_ROOT, DEFAULT_LANGUAGE, AVAILABLE_LOCALES, PROJECT_NAME, ALLOWED_ORIGINS, ENVIRONMENT, ON_VERCEL } = require('./appConfig');
const { logProcessErrors } = require('./helpers/logger.helper');
const requestContext = require('./middlewares/requestContext.middleware');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');
const { limiters } = require('./middlewares/rateLimit.middleware');
const health = require('./routes/health.route');
const docs = require('./docs');

// Builds the Express app only: no listen, no database connect, no queries, and no timers beyond the rate-limit
// stores' unref'd expiry timers. src/server.js runs it locally; a serverless handler can import it as-is, because
// requireDb connects on the first database-backed request.
const app = express();

// Unhandled rejections and uncaught exceptions are logged, here and in src/server.js (which loads this module).
logProcessErrors();

require('./models');

// Request ID, per-request logger and the access log line: first, so every response carries X-Request-Id.
app.use(requestContext);

// Helmet
app.use(helmet());

// req.ip (the rate-limit key) comes from X-Forwarded-For only behind Vercel's proxy, which sets that header itself;
// anywhere else the header is client-controlled and ignored (the socket address is used).
app.set('trust proxy', ON_VERCEL ? 1 : false);

// Express 5 defaults to the simple query parser; keep qs parsing (nested keys) as in Express 4.
app.set('query parser', 'extended');

// CORS: the one setup, an allowlist from ALLOWED_ORIGINS (src/env.js). An allowed origin is echoed with credentials;
// any other gets no Access-Control-Allow-* headers, so the browser blocks it. Preflights answer 204 here.
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Accept-Language'],
  }),
);
app.set('views', path.join(PROJECT_ROOT, 'src', 'views'));
// Registered explicitly: Express's own lookup requires `ejs` from inside its package, which pnpm + Vercel's file
// tracing don't provide (MODULE_NOT_FOUND on Vercel).
app.engine('ejs', require('ejs').__express);
app.set('view engine', 'ejs');

// i18n
i18n.configure({
  locales: AVAILABLE_LOCALES,
  directory: path.join(PROJECT_ROOT, 'src', 'locales'),
  defaultLocale: DEFAULT_LANGUAGE,
  // Never write to the locale files at runtime (an unknown key would be added to en.json): serverless-safe.
  updateFiles: false,
  syncFiles: false,
});

app.use(i18n.init);

// extend req and response
app.use(require('./middlewares/extendReq.middleware'));

// Rate limits (middlewares/rateLimit.middleware.js): a general limit on every request, slowed down before it; the
// stricter named limits sit on their routes.
app.use(limiters.slowDown, limiters.general);

// Health check (routes/health.route.js): before the body parsers and requireDb, so it does no other work and
// answers 503 itself, within its own time limits, while the database is down.
app.get('/health', health);

// API reference (src/docs): GET /openapi.json, generated from the shared zod schemas on first request, and GET /docs,
// the interactive page with its own CSP. Public; no database.
app.use(docs.router);

// Bodies: JSON only, 100 kb at most (a larger one answers 413). No client sends urlencoded bodies, and a form post is
// the cross-site (CSRF) path, so they are not parsed. Multipart is parsed only on the upload route
// (middlewares/upload.middleware.js), with its own limit. The raw bytes of a JSON body stay on `req.rawBody`: the
// Razorpay webhooks verify their signature over exactly those bytes.
const keepRawBody = (req, res, buffer) => {
  req.rawBody = buffer;
};
app.use(express.json({ limit: '100kb', verify: keepRawBody }));
app.use(cookieParser());

// Disable x-powered-by header
app.disable('x-powered-by');
app.set('env', ENVIRONMENT);

// delete all headers related to cache
app.use((req, res, next) => {
  req.headers['if-none-match'] = '';
  req.headers['if-modified-since'] = '';
  next();
});

// compression responses
app.use(compression({ threshold: 512 }));

app.use(`/resources`, express.static(path.join(PROJECT_ROOT, 'resources')));

// load routes
const router = require('./routes');
app.use('/api/v1', router);

// static files middleware
app.use('/', express.static(path.join(PROJECT_ROOT, 'public')));

// static files middleware
app.use('/public', express.static(path.join(PROJECT_ROOT, 'public')));

// It works route
app.get('/', (req, res) => {
  return res.render('index', { PROJECT_NAME });
});

// Last: a JSON 404 for anything unmatched, then the one error handler.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
