const { z } = require('zod');
const { apiResponse } = require('@pageaters/shared');

const { ref } = require('../schemas');

// Health, webhooks and this reference: the routes outside the shopper and admin areas.

// The few answers that are not a shared envelope, described as the code sends them (no new contract).
const extraResponseSchemas = {
  // The generic envelope, for routes whose `data` has no shared schema yet.
  ApiResponse: apiResponse(z.unknown()),
  // routes/health.route.js
  HealthStatus: z.object({ status: z.enum(['ok', 'unavailable']) }),
  // routes/index.js
  ApiRoot: z.object({ name: z.string(), status: z.string(), message: z.string() }),
  // The Razorpay webhooks (order.controller.js).
  WebhookAck: z.object({ status: z.literal('ok') }),
};

const razorpayEvent = { type: 'object', description: 'The Razorpay event, as Razorpay sends it.' };
const signature = { 'X-Razorpay-Signature': 'Hex HMAC-SHA256 of the raw body under the webhook secret.' };

const platform = (method, path, tag, summary, rest) => ({ method, path, tag, summary, auth: 'public', ...rest });

const routes = [
  platform('GET', '/health', 'Health', 'Health check', {
    description: 'Pings MongoDB (connecting first on a cold instance). 503 `{ "status": "unavailable" }` when it is down.',
    content: { 'application/json': ref('HealthStatus') },
    responses: {
      503: { description: 'The database is unreachable.', content: { 'application/json': { schema: ref('HealthStatus') } } },
    },
  }),
  platform('GET', '/', 'Health', 'Landing page', {
    description: 'A plain “it works” page.',
    content: { 'text/html': { type: 'string' } },
  }),
  platform('GET', '/api/v1/', 'Health', 'API root', {
    description: 'Answers without touching the database.',
    content: { 'application/json': ref('ApiRoot') },
  }),

  platform('POST', '/api/v1/orders/confirm', 'Webhooks', 'Payment captured', {
    description: 'Razorpay’s payment webhook: verifies the signature, then marks the order paid.',
    headers: signature,
    rawBody: razorpayEvent,
    content: { 'application/json': ref('WebhookAck') },
  }),
  platform('POST', '/api/v1/orders/refund/processed', 'Webhooks', 'Refund processed', {
    description: 'Razorpay’s refund webhook: verifies the signature, then records the refund.',
    headers: signature,
    rawBody: razorpayEvent,
    content: { 'application/json': ref('WebhookAck') },
  }),

  platform('GET', '/api/v1/demo/cleanup', 'Demo', 'Weekly demo cleanup', {
    description:
      'DEMO_MODE only (404 otherwise); called by Vercel Cron. Wipes visitor orders (putting their stock back), carts, addresses, favourites and the outbox, then places four sample orders (confirmed, shipped, fulfilled, cancelled). 401 without the cron secret.',
    headers: { Authorization: '`Bearer <CRON_SECRET>`.' },
    content: { 'application/json': ref('ApiResponse') },
  }),

  platform('GET', '/openapi.json', 'Docs', 'OpenAPI document', {
    description: 'This document, generated from the shared zod schemas.',
    content: { 'application/json': { type: 'object' } },
  }),
  platform('GET', '/docs', 'Docs', 'API reference', {
    description: 'This page (Scalar API Reference).',
    content: { 'text/html': { type: 'string' } },
  }),
];

module.exports = { extraResponseSchemas, routes };
