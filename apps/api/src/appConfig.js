const path = require('path');

const env = process.env;

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:4200'];

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const allowedOrigins = parseList(env.ALLOWED_ORIGINS);

module.exports = {
  ENVIRONMENT: env.APP_ENV || 'development',
  PROJECT_ROOT: path.join(__dirname, '..'),
  PROJECT_NAME: 'PAGEATERS_API',
  PORT: Number(env.PORT) || 5005,
  MONGODB_URL: env.MONGODB_URI,
  ENCRYPTION_KEY: env.ENCRYPTION_KEY,
  AWS: {
    BUCKET_REGION: env.S3_REGION,
    BUCKET_ACCESS_KEY: env.S3_ACCESS_KEY_ID,
    BUCKET_SECRET_KEY: env.S3_SECRET_ACCESS_KEY,
    CLOUDFRONT_ACCESS_POINT: env.IMAGE_CDN_URL,
  },
  RAZOR_PAY: {
    USER_ID: env.RAZORPAY_KEY_ID,
    PASSWORD: env.RAZORPAY_KEY_SECRET,
  },
  RAZOR_PAY_WEBHOOKS: {
    PAYMENT_CAPTURED: env.RAZORPAY_WEBHOOK_SECRET,
    PAYMENT_REFUND_COMPLETE: env.RAZORPAY_WEBHOOK_SECRET,
  },
  TWILIO: {
    ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
    AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
    PHONE: env.TWILIO_PHONE,
  },
  DELHIVERY: {
    BASE_URL: env.DELHIVERY_BASE_URL || 'https://staging-express.delhivery.com',
    API_TOKEN: env.DELHIVERY_API_TOKEN,
  },
  ENABLE_CRON: env.ENABLE_CRON === 'true',
  SENDGRID_API_KEY: env.SENDGRID_API_KEY,
  NO_REPLY_EMAIL: env.MAIL_FROM || 'no-reply@demo.pageaters.com',
  DEFAULT_LANGUAGE: 'en',
  AVAILABLE_LOCALES: ['en'],
  HOST: env.STOREFRONT_URL || 'http://localhost:3000',
  ALLOWED_ORIGINS: allowedOrigins.length ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS,
  DELETE_ACCOUNT_DATA_AFTER: [90, 'd'],
};
