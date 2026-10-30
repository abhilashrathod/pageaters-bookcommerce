const emailMock = require('../../src/adapters/email/mock');
const smsMock = require('../../src/adapters/sms/mock');

// What the app "sent": the mock adapters' in-memory lists (the test env selects EMAIL_ADAPTER=mock and
// SMS_ADAPTER=mock, ./env). Sends are awaited before the app answers, so after `await api.request(…)` every message
// of that request is here. api.reset() empties both.

/**
 * The e-mails sent so far in this test, oldest first: `{ from, to, subject, html }`.
 * @returns {{ from: string, to: string, subject?: string, html: string }[]}
 */
const sentEmails = () => emailMock.list();

/**
 * The texts sent so far in this test, oldest first: `{ to, body }`.
 * @returns {{ to: string, body: string }[]}
 */
const sentTexts = () => smsMock.list();

// The other mock adapters record what they were asked to do (payment orders, shipments, uploads); tests read them
// through the adapter (`require('../src/adapters/payments').list()`, …). Required here only when clearing, so loading
// the harness doesn't read the environment early.
const MOCK_ADAPTERS = ['payments', 'shipping', 'storage'];

const clearOutbox = () => {
  emailMock.clear();
  smsMock.clear();
  for (const kind of MOCK_ADAPTERS) require(`../../src/adapters/${kind}`).clear();
};

module.exports = { clearOutbox, sentEmails, sentTexts };
