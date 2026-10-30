const crypto = require('node:crypto');

const { createRecorder } = require('../recorder');
const { isValidSignature } = require('./signature');

// Mock payments adapter (the default). No money moves and nothing leaves the process:
// - createOrder answers a Razorpay-shaped order with a fake id, `order_mock` + 14 hex characters of
//   HMAC-SHA256(salt, `<receipt>:<n>`), n counting this instance's orders from 1. The salt is random per process
//   (tests may pass one), so an id can't be derived from an order's receipt; with the same salt the same calls give
//   the same ids, and placing the same order again gives a new id (as Razorpay does). Each created order is recorded
//   (before createOrder resolves) in a bounded list, the newest 50: list() / clear().
// - verifyWebhookSignature uses Razorpay's scheme (hex HMAC-SHA256 of the raw body, constant-time compare) over the
//   configured RAZORPAY_WEBHOOK_SECRET. Without a secret it verifies nothing (always false), so webhooks can't be
//   forged with a known value; src/env.js requires the secret in staging and production. To run checkout → webhook
//   → paid locally, set a secret and sign the body with it.
// Never logs anything.

/** @typedef {import('./types').PaymentsAdapter} PaymentsAdapter */
/** @typedef {import('./types').PaymentOrder} PaymentOrder */

/**
 * @param {{ webhookSecret?: string, idSalt?: string | Buffer }} [config] `idSalt` defaults to 16 random bytes.
 * @returns {PaymentsAdapter & { list: () => PaymentOrder[], clear: () => void }}
 */
const create = ({ webhookSecret, idSalt = crypto.randomBytes(16) } = {}) => {
  const recorder = createRecorder();
  let count = 0;

  return {
    name: 'mock',
    createOrder: async ({ amount, currency, receipt }) => {
      count += 1;
      const id = `order_mock${crypto.createHmac('sha256', idSalt).update(`${receipt}:${count}`).digest('hex').slice(0, 14)}`;
      const order = { id, entity: 'order', amount, amount_paid: 0, amount_due: amount, currency, receipt, status: 'created', attempts: 0 };
      recorder.record({ ...order });
      return order;
    },
    verifyWebhookSignature: (rawBody, signature) => isValidSignature(rawBody, signature, webhookSecret),
    list: recorder.list,
    clear: recorder.clear,
  };
};

module.exports = { create };
