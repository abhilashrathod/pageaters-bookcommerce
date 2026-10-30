// Placeholder config for every API test: shapes the env schema (src/env.js) and the SDK constructors accept,
// nothing real. Never the owner's .env. Each test file sets MONGODB_URI itself. Every adapter is the mock: e-mail and
// SMS (read them with ./outbox), payments (webhooks signed with RAZORPAY_WEBHOOK_SECRET, see fixtures/orders.js
// razorpaySignature), shipping and storage. The vendor SDKs stay stubbed (./stubs) in case anything reaches them.
const TEST_ENV = Object.freeze({
  APP_ENV: 'test',
  ENCRYPTION_KEY: 'test-only-key-'.padEnd(32, '0'),
  RAZORPAY_KEY_ID: 'rzp_test_placeholder',
  RAZORPAY_KEY_SECRET: 'test',
  RAZORPAY_WEBHOOK_SECRET: 'test',
  EMAIL_ADAPTER: 'mock',
  SMS_ADAPTER: 'mock',
  PAYMENTS_ADAPTER: 'mock',
  SHIPPING_ADAPTER: 'mock',
  STORAGE_ADAPTER: 'mock',
});

module.exports = { TEST_ENV };
