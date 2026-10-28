const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const i18n = require('i18n');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const { PROJECT_ROOT, DEFAULT_LANGUAGE, AVAILABLE_LOCALES, PROJECT_NAME, ALLOWED_ORIGINS, ENVIRONMENT } = require('./appConfig');
const requireDb = require('./middlewares/requireDb.middleware');

// Builds the Express app only: no listen, no database connect, no timers, no queries. src/server.js runs it
// locally; a serverless handler can import it as-is, because requireDb connects on the first database-backed
// request.
const app = express();

require('./models');

if (ENVIRONMENT !== 'test') {
  app.use(morgan(':method :url :status - :response-time ms'));
}

// Helmet
app.use(helmet());

// For NGINX
app.set('trust proxy', 1);

// Express 5 defaults to the simple query parser; keep qs parsing (nested keys) as in Express 4.
app.set('query parser', 'extended');

// parse JSON and urlencoded bodies
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
app.use(cookieParser());
app.set('views', path.join(PROJECT_ROOT, 'src', 'views'));
app.set('view engine', 'ejs');

// i18n
i18n.configure({
  locales: AVAILABLE_LOCALES,
  directory: path.join(PROJECT_ROOT, 'src', 'locales'),
  defaultLocale: DEFAULT_LANGUAGE,
});

app.use(i18n.init);

// extend req and response
app.use(require('./middlewares/extendReq.middleware'));

// Search indexes (lunr): built once per process when the first MongoDB connection opens, never at import, so
// loading the app queues no queries. src/server.js connects at boot; a serverless instance connects on its first
// database-backed request. GET /re-index rebuilds them.
const { runIndexing } = require('./libs/indexing');
if (mongoose.connection.readyState === 1) runIndexing(app);
else mongoose.connection.once('connected', () => runIndexing(app));

// Disable x-powered-by header
app.disable('x-powered-by');
app.set('env', ENVIRONMENT);

// Handle `OPTIONS` request.
app.all('/{*splat}', (req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Accept-Language, x-client-id, x-client-secret, x-client-device',
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method == 'OPTIONS') {
    return res.status(200).end();
  } else {
    next();
  }
});

// delete all headers related to cache
app.use((req, res, next) => {
  req.headers['if-none-match'] = '';
  req.headers['if-modified-since'] = '';
  res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  next();
});

// compression responses
app.use(compression({ threshold: 512 }));

let corsOptions = {
  origin: true,
  credentials: true,
};
app.use(cors(corsOptions));

app.use(`/resources`, express.static(path.join(PROJECT_ROOT, 'resources')));

// multer for file upload
app.use(multer().any());

// rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute will have "max" 75 API request
  limit: 150,
  message: 'LIMIT REACHED: Too many requests were created from this IP. Please try again after an hour. Please contact support in such case if you were not responsible',
});

// slow down before threshold
const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 125,
  delayMs: (used, req) => (used - req.slowDown.limit) * 500, // +500 ms per request over delayAfter (v1 behaviour)
});

// load routes
const router = require('./routes');
app.use('/api/v1', router);

// static files middleware
app.use('/', express.static(path.join(PROJECT_ROOT, 'public')));

// static files middleware
app.use('/public', express.static(path.join(PROJECT_ROOT, 'public')));

// sitemap
const siteMap = require('./libs/sitemap');
app.use('/sitemap.xml', requireDb, siteMap);

// google products
const writeGoogleData = require('./libs/googledata');
app.use('/googleproducts.xml', requireDb, writeGoogleData);

// for re-indexing
app.get('/re-index', requireDb, (req, res) => {
  runIndexing(app);

  return res.send({
    name: PROJECT_NAME,
    status: 'REINDEX_COMPLETED',
    message: 'successs',
  });
});

// It works route
app.get('/', (req, res) => {
  return res.render('index', { PROJECT_NAME });
});

module.exports = app;
