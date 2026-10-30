// The email adapter contract (AGENTS.md §4.4). `sendgrid.js` and `mock.js` implement it; `index.js` exports the one
// EMAIL_ADAPTER selects. Application code sends through services/mail.service.js, never through a vendor SDK.

/**
 * One rendered e-mail.
 * @typedef {object} EmailMessage
 * @property {string} from Sender address (MAIL_FROM).
 * @property {string} to Recipient address.
 * @property {string} [subject]
 * @property {string} html Rendered body.
 */

/**
 * @typedef {object} EmailAdapter
 * @property {'sendgrid' | 'mock'} name
 * @property {(message: EmailMessage) => Promise<void>} send Sends one message; rejects when it was not accepted.
 */

module.exports = {};
