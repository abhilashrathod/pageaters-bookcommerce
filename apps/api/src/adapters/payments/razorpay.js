const { vendorError } = require('../vendor-error');
const { isValidSignature } = require('./signature');

// Real payments adapter: Razorpay. Loaded only when PAYMENTS_ADAPTER=razorpay (src/env.js then requires its keys
// and, as with any RAZORPAY_KEY_ID, refuses a live `rzp_live_` key: test mode only, AGENTS.md §6).

/** @typedef {import('./types').PaymentsAdapter} PaymentsAdapter */

// Every call is bounded so a slow vendor can't hold a request (and a serverless invocation) open.
const TIMEOUT_MS = 10_000;

const KEYS = { keyId: 'RAZORPAY_KEY_ID', keySecret: 'RAZORPAY_KEY_SECRET', webhookSecret: 'RAZORPAY_WEBHOOK_SECRET' };

/**
 * Builds the Razorpay adapter. The SDK is required and its client constructed here, not at module load, so nothing
 * touches it unless this adapter is selected.
 * @param {{ keyId?: string, keySecret?: string, webhookSecret?: string }} config
 * @returns {PaymentsAdapter} `createOrder` rejects with `Error('Payment order failed')` carrying only Razorpay's
 *   error code and HTTP status.
 * @throws {Error} naming each missing variable (never a value).
 */
const create = (config = {}) => {
  const missing = Object.entries(KEYS)
    .filter(([key]) => !config[key])
    .map(([, name]) => name);
  if (missing.length > 0) throw new Error(`The Razorpay payments adapter needs ${missing.join(', ')}`);

  const Razorpay = require('razorpay');
  const client = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  // The SDK has no timeout option; its HTTP client is an axios instance (razorpay 2.9.8, pinned).
  const http = client.api?.rq?.defaults;
  if (!http) throw new Error('The Razorpay SDK no longer exposes its HTTP client; set the request timeout another way');
  http.timeout = TIMEOUT_MS;

  return {
    name: 'razorpay',
    createOrder: async ({ amount, currency, receipt }) => {
      try {
        return await client.orders.create({ amount, currency, receipt });
      } catch (error) {
        // Razorpay rejects with { statusCode, error: { code, description } }. Without an HTTP answer (timeout, network
        // error) its normalizeError reads `err.response.status` of undefined and throws a TypeError instead.
        if (error instanceof TypeError) throw vendorError('Payment order failed', { code: 'NO_RESPONSE' });
        throw vendorError('Payment order failed', { code: error?.error?.code, status: error?.statusCode });
      }
    },
    // Razorpay's scheme, compared in constant time (the SDK's check uses ===).
    verifyWebhookSignature: (rawBody, signature) => isValidSignature(rawBody, signature, config.webhookSecret),
  };
};

module.exports = { TIMEOUT_MS, create };
