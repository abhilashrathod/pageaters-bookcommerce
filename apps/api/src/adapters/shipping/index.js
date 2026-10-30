const { env } = require('../../env');

// The shipping adapter SHIPPING_ADAPTER selects: `mock` (default) or `delhivery`. Only the selected implementation
// is loaded.

/** @type {import('./types').ShippingAdapter} */
module.exports =
  env.SHIPPING_ADAPTER === 'delhivery'
    ? require('./delhivery').create({ baseUrl: env.DELHIVERY_BASE_URL, token: env.DELHIVERY_API_TOKEN })
    : require('./mock');
