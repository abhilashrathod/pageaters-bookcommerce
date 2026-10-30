const { vendorError } = require('../vendor-error');

// Real SMS adapter: Twilio. Loaded only when SMS_ADAPTER=twilio (src/env.js then requires its keys).

/** @typedef {import('./types').SmsAdapter} SmsAdapter */

// Every call is bounded so a slow vendor can't hold a request (and a serverless invocation) open.
const TIMEOUT_MS = 10_000;

const KEYS = { accountSid: 'TWILIO_ACCOUNT_SID', authToken: 'TWILIO_AUTH_TOKEN', from: 'TWILIO_PHONE' };

/**
 * Builds the Twilio adapter. The SDK is required and its client constructed here, not at module load, so nothing
 * touches it unless this adapter is selected.
 * @param {{ accountSid?: string, authToken?: string, from?: string }} config `from` is the sender number (E.164).
 * @returns {SmsAdapter} `send` rejects with `Error('SMS send failed')` carrying only Twilio's `code`/`status`.
 * @throws {Error} naming each missing variable (never a value).
 */
const create = (config = {}) => {
  const missing = Object.entries(KEYS)
    .filter(([key]) => !config[key])
    .map(([, name]) => name);
  if (missing.length > 0) throw new Error(`The Twilio SMS adapter needs ${missing.join(', ')}`);

  const client = require('twilio')(config.accountSid, config.authToken, { timeout: TIMEOUT_MS });

  return {
    name: 'twilio',
    send: async ({ to, body }) => {
      try {
        await client.messages.create({ body, from: config.from, to });
      } catch (error) {
        throw vendorError('SMS send failed', error);
      }
    },
  };
};

module.exports = { TIMEOUT_MS, create };
