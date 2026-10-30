// The SMS adapter contract (AGENTS.md §4.4). `twilio.js` and `mock.js` implement it; `index.js` exports the one
// SMS_ADAPTER selects. Application code depends on this, never on a vendor SDK.

/**
 * One text message. The sender number belongs to the real adapter's config (TWILIO_PHONE).
 * @typedef {object} SmsMessage
 * @property {string} to Recipient in E.164 form, e.g. `+91` and the 10-digit number.
 * @property {string} body
 */

/**
 * @typedef {object} SmsAdapter
 * @property {'twilio' | 'mock'} name
 * @property {(message: SmsMessage) => Promise<void>} send Sends one text; rejects when it was not accepted.
 */

module.exports = {};
