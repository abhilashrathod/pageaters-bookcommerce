// Placeholder config for every API test: shapes the env schema (src/env.js) and the SDK constructors accept,
// nothing real. Never the owner's .env. Each test file sets MONGODB_URI itself.
const TEST_ENV = Object.freeze({
  APP_ENV: 'test',
  ENCRYPTION_KEY: 'test-only-key-'.padEnd(32, '0'),
  TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}`,
  TWILIO_AUTH_TOKEN: 'test',
  RAZORPAY_KEY_ID: 'rzp_test_placeholder',
  RAZORPAY_KEY_SECRET: 'test',
  RAZORPAY_WEBHOOK_SECRET: 'test',
  SENDGRID_API_KEY: 'SG.test',
});

module.exports = { TEST_ENV };
