const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const i18n = require('i18n');
const helmet = require("helmet");
const morgan = require('morgan');
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

const { PORT, PROJECT_ROOT, DEFAULT_LANGUAGE, AVAILABLE_LOCALES, PROJECT_NAME, ENVIRONMENT } = require('./appConfig');
const connectToDb = require('./helpers/connectToDb.helper');
const { checkEnvVariables } = require('./helpers/utils.helper');

checkEnvVariables();

module.exports.app = express();

require('./models');

if (ENVIRONMENT !== 'test') {
  this.app.use(morgan(':method :url :status - :response-time ms'));
}

// Helmet
this.app.use(helmet());

// For NGINX
this.app.set('trust proxy', 1);

// body-parser needed to parse form-data bodies
this.app.use(bodyParser.json({ limit: '100mb' }));
this.app.use(bodyParser.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
this.app.use(cookieParser());
this.app.set('views', path.join(PROJECT_ROOT, 'src', 'views'));
this.app.set('view engine', 'ejs');

// slow down before threshold
const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 50,
  delayMs: 500
});

// i18n
i18n.configure({ locales: AVAILABLE_LOCALES, directory: path.join(PROJECT_ROOT, 'src', 'locales'), defaultLocale: DEFAULT_LANGUAGE });

this.app.use(i18n.init);

// extend req and res
this.app.use(require('./middlewares/extendReq.middleware'));

// Disable x-powered-by header
this.app.disable('x-powered-by');
this.app.set('env', ENVIRONMENT);

// Handle `OPTIONS` request.
this.app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Accept-Language, x-client-id, x-client-secret, x-client-device',
  );

  if (req.method == 'OPTIONS') {
    return res.status(200).end();
  } else {
    next();
  }
});

// delete all headers related to cache
this.app.use((req, res, next) => {
  req.headers['if-none-match'] = '';
  req.headers['if-modified-since'] = '';
  res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  next();
});

// compression responses
this.app.use(compression({ threshold: 512 }));

// enabling CORS for all routes.
this.app.use(cors());

this.app.use(`/resources`, express.static(path.join(PROJECT_ROOT, 'resources')));

// multer for file upload
this.app.use(multer().any());

// rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute will have "max" 75 API request
  max: 75,
  message: "Too many accounts created from this IP, please try again after an hour. Contact support in such case if you were not responsible"
});

// load routes
const router = require('./routes');
this.app.use('/api/v1', apiLimiter, speedLimiter, router);

// static files middleware
this.app.use('/', express.static(path.join(PROJECT_ROOT, 'public')));

// static files middleware
this.app.use('/public', express.static(path.join(PROJECT_ROOT, 'public')));

// It works route
this.app.get('/', (req, res) => {
  return res.render('index', { PROJECT_NAME });

  return res.send({
    name: PROJECT_NAME,
    status: 'IT_WORKS',
    message: 'This is not the api basepath though. Try looking a little deeper..',
  });
});

/**
 * Start server
 */
module.exports.startServer = async () => {
  return new Promise(async resolve => {
    // connect to database
    await connectToDb();

    // load seed data.
    await require('../scripts/seedData').initSeedData();

    this.app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);

      // schedule cron jobs after server starts.
      setTimeout(() => {
        require('./jobs').schedule();
      }, 2000);

      return resolve();
    });
  });
};
