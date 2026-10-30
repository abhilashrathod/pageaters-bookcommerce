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

const clearOutbox = () => {
  emailMock.clear();
  smsMock.clear();
};

module.exports = { clearOutbox, sentEmails, sentTexts };
