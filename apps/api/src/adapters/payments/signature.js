const crypto = require('node:crypto');

// Razorpay's webhook signature scheme, shared by the real and the mock payments adapter: the `X-Razorpay-Signature`
// header is the hex HMAC-SHA256 of the raw body under the webhook secret. Compared in constant time; false without
// a secret or a signature, so an unconfigured secret verifies nothing.

/**
 * @param {string} rawBody What was signed.
 * @param {unknown} signature The header value.
 * @param {string | undefined} secret The webhook secret.
 * @returns {boolean}
 */
const isValidSignature = (rawBody, signature, secret) => {
  if (!secret || typeof signature !== 'string' || signature.length === 0) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(String(rawBody)).digest('hex'));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

module.exports = { isValidSignature };
