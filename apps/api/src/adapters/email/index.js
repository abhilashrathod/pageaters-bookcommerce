const { env } = require('../../env');

// The email adapter EMAIL_ADAPTER selects: `mock` (default) or `sendgrid`. Only the selected implementation is
// loaded, so the SendGrid SDK is never required when the mock is in use.

/** @type {import('./types').EmailAdapter} */
module.exports = env.EMAIL_ADAPTER === 'sendgrid' ? require('./sendgrid').create({ apiKey: env.SENDGRID_API_KEY }) : require('./mock');
