const { env } = require('../../env');

// The payments adapter PAYMENTS_ADAPTER selects: `mock` (default) or `razorpay`. Only the selected implementation
// is loaded, so the Razorpay SDK is never required (and no client constructed) when the mock is in use. Either
// way src/env.js refuses a live `rzp_live_` RAZORPAY_KEY_ID (AGENTS.md §6).

/** @type {import('./types').PaymentsAdapter} */
module.exports =
  env.PAYMENTS_ADAPTER === 'razorpay'
    ? require('./razorpay').create({
        keyId: env.RAZORPAY_KEY_ID,
        keySecret: env.RAZORPAY_KEY_SECRET,
        webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
      })
    : require('./mock').create({ webhookSecret: env.RAZORPAY_WEBHOOK_SECRET });
