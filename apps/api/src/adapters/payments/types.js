// The payments adapter contract (AGENTS.md §4.4). `razorpay.js` and `mock.js` implement it; `index.js` exports the
// one PAYMENTS_ADAPTER selects. Application code (services/order-payment.service.js) depends on this, never on the
// Razorpay SDK. The shapes are Razorpay's, so checkout answers and stored orders stay the same with either adapter.

/**
 * The payment order a shopper pays at checkout.
 * @typedef {object} PaymentOrderRequest
 * @property {number} amount In paise (rupees × 100).
 * @property {'INR'} currency
 * @property {string} receipt Our reference, `<orderId>-RCPTID`.
 */

/**
 * The created payment order, as Razorpay answers it (`id` is what checkout stores and the webhook matches).
 * @typedef {object} PaymentOrder
 * @property {string} id `order_…`
 * @property {number} amount In paise.
 * @property {string} currency
 * @property {string} receipt
 * @property {string} [status] `created`.
 */

/**
 * @typedef {object} PaymentsAdapter
 * @property {'razorpay' | 'mock'} name
 * @property {string} keyId The public key id the browser's Razorpay Checkout opens with (never the secret).
 * @property {(order: PaymentOrderRequest) => Promise<PaymentOrder>} createOrder Creates a payment order; rejects
 *   when it was not created.
 * @property {(rawBody: string, signature?: string) => boolean} verifyWebhookSignature Whether `signature` (the
 *   `X-Razorpay-Signature` header) is the hex HMAC-SHA256 of `rawBody` under the webhook secret (constant-time
 *   compare). False without a signature or without a configured secret.
 */

module.exports = {};
