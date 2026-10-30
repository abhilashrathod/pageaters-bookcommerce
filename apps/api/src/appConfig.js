const path = require('path');

const { env } = require('./env');

// The app's config shape, mapped from the validated environment (src/env.js).
module.exports = {
  ENVIRONMENT: env.APP_ENV,
  PROJECT_ROOT: path.join(__dirname, '..'),
  PROJECT_NAME: 'PAGEATERS_API',
  PORT: env.PORT,
  MONGODB_URL: env.MONGODB_URI,
  ENCRYPTION_KEY: env.ENCRYPTION_KEY,
  NO_REPLY_EMAIL: env.MAIL_FROM,
  DEFAULT_LANGUAGE: 'en',
  AVAILABLE_LOCALES: ['en'],
  // Without a trailing slash, so links built as `${HOST}/path` never get `//`.
  HOST: env.STOREFRONT_URL.replace(/\/+$/, ''),
  ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
  // Vercel sets VERCEL=1 in its builds and functions.
  ON_VERCEL: env.VERCEL !== undefined,
};
