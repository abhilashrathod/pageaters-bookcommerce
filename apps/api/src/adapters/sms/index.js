const { env } = require('../../env');

// The SMS adapter SMS_ADAPTER selects: `mock` (default) or `twilio`. Only the selected implementation is loaded,
// so the Twilio SDK is never required (and no client constructed) when the mock is in use.

/** @type {import('./types').SmsAdapter} */
module.exports =
  env.SMS_ADAPTER === 'twilio'
    ? require('./twilio').create({ accountSid: env.TWILIO_ACCOUNT_SID, authToken: env.TWILIO_AUTH_TOKEN, from: env.TWILIO_PHONE })
    : require('./mock');
