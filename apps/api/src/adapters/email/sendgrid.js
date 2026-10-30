const { vendorError } = require('../vendor-error');

// Real email adapter: SendGrid. Loaded only when EMAIL_ADAPTER=sendgrid (src/env.js then requires its keys).

/** @typedef {import('./types').EmailAdapter} EmailAdapter */

// Every call is bounded so a slow vendor can't hold a request (and a serverless invocation) open.
const TIMEOUT_MS = 10_000;

/**
 * Builds the SendGrid adapter. The SDK is required here, not at module load, so nothing touches it unless this
 * adapter is selected.
 * @param {{ apiKey?: string }} config
 * @returns {EmailAdapter} `send` rejects with `Error('Email send failed')` carrying only SendGrid's `code`/`status`.
 * @throws {Error} naming SENDGRID_API_KEY when it is missing (never a value).
 */
const create = ({ apiKey } = {}) => {
  if (!apiKey) throw new Error('The SendGrid email adapter needs SENDGRID_API_KEY');

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(apiKey);
  sgMail.setTimeout(TIMEOUT_MS);

  return {
    name: 'sendgrid',
    send: async ({ from, to, subject, html }) => {
      try {
        await sgMail.send({ from, to, subject, html });
      } catch (error) {
        throw vendorError('Email send failed', error);
      }
    },
  };
};

module.exports = { TIMEOUT_MS, create };
