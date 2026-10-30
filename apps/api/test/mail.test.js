const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { captureLogs, messagesAt, sentEmails, startTestApp } = require('./helpers');
const email = require('../src/adapters/email');

// services/mail.service.js: render → send through the email adapter → log_email, never throwing; and template data
// can never act as ejs compile options.

const EmailLog = () => mongoose.model('log_email');

// Harmless markers: if ejs ever took compile options from the data, `client` + `escapeFunction` would put this
// expression into the compiled template and set the global flag; `delimiter` would stop the tags from rendering.
const MARKER = '__pageatersEjsOptionMarker';
const OPTION_KEYS = {
  settings: { 'view options': { client: true, escapeFunction: `(globalThis.${MARKER} = true, String)`, delimiter: '?' } },
  client: true,
  escapeFunction: `(globalThis.${MARKER} = true, String)`,
  delimiter: '?',
};

// Required after startTestApp() has loaded the models.
const cancelMail = (data) =>
  require('../src/services/mail.service').sendTemplateMail({ emailModule: 'CANCEL_ORDER', to: 'reader@example.com', subject: 'Test subject', data: { ORDER_ID: 'OD-TEST-1', FULL_NAME: 'Test Reader', ...data } });

let api;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  delete globalThis[MARKER];
});

describe('sendTemplateMail', () => {
  test('renders the template, sends it and logs it', async () => {
    assert.equal(await cancelMail(), undefined);
    const [mail] = sentEmails();
    assert.deepEqual(
      { from: mail.from, to: mail.to, subject: mail.subject },
      { from: 'no-reply@demo.pageaters.com', to: 'reader@example.com', subject: 'Test subject' },
    );
    assert.ok(mail.html.includes('OD-TEST-1') && mail.html.includes('Test Reader'));
    // 7d: the log keeps module, recipient, subject and time only (never the rendered html).
    const [log] = await EmailLog().find().lean();
    assert.deepEqual(Object.keys(log).sort(), ['_id', 'createdAt', 'emailModule', 'subject', 'to', 'updatedAt']);
    assert.deepEqual({ emailModule: log.emailModule, to: log.to, subject: log.subject }, { emailModule: 'CANCEL_ORDER', to: mail.to, subject: mail.subject });
  });

  test('template data never acts as ejs options (settings, client, escapeFunction, delimiter)', async () => {
    await cancelMail(OPTION_KEYS);
    assert.equal(globalThis[MARKER], undefined, 'no code from the data ran');
    const [mail] = sentEmails();
    assert.equal(typeof mail.html, 'string');
    assert.ok(mail.html.includes('OD-TEST-1'), 'tags rendered with the default delimiter');
    assert.doesNotMatch(mail.html, /<%=/);
  });

  test('a failed send is logged as not sent, by template name only, and nothing is recorded', async (t) => {
    t.mock.method(email, 'send', async () => {
      throw Object.assign(new Error('Email send failed'), { code: 401 });
    });
    const logs = captureLogs(t);
    await cancelMail();
    assert.deepEqual(messagesAt(logs), ['Email CANCEL_ORDER not sent (Error 401)']);
    assert.equal(await EmailLog().countDocuments(), 0);
  });

  test('a failed log write is reported as sent but not logged', async (t) => {
    t.mock.method(EmailLog(), 'create', async () => {
      throw Object.assign(new Error('write failed for reader@example.com'), { name: 'MongoServerError', code: 11000 });
    });
    const logs = captureLogs(t);
    await cancelMail();
    assert.equal(sentEmails().length, 1);
    assert.deepEqual(messagesAt(logs), ['Email CANCEL_ORDER sent, not logged (MongoServerError 11000)']);
  });
});
