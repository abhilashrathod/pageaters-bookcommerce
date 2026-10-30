const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { sentEmails, startTestApp } = require('./helpers');
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
    const [log] = await EmailLog().find().lean();
    assert.deepEqual({ ...mail, emailModule: 'CANCEL_ORDER' }, { from: log.from, to: log.to, subject: log.subject, html: log.html, emailModule: log.emailModule });
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
    const errors = t.mock.method(console, 'error', () => {});
    await cancelMail();
    assert.deepEqual(
      errors.mock.calls.map((call) => call.arguments.join(' ')),
      ['Email CANCEL_ORDER not sent (Error 401)'],
    );
    assert.equal(await EmailLog().countDocuments(), 0);
  });

  test('a failed log write is reported as sent but not logged', async (t) => {
    t.mock.method(EmailLog(), 'create', async () => {
      throw Object.assign(new Error('write failed for reader@example.com'), { name: 'MongoServerError', code: 11000 });
    });
    const errors = t.mock.method(console, 'error', () => {});
    await cancelMail();
    assert.equal(sentEmails().length, 1);
    assert.deepEqual(
      errors.mock.calls.map((call) => call.arguments.join(' ')),
      ['Email CANCEL_ORDER sent, not logged (MongoServerError 11000)'],
    );
  });
});

describe('POST /public/contactUs', () => {
  test('passes on only the template keys: option keys in the body have no effect', async () => {
    const body = {
      ORDER_ID: 'TEST-ORDER-2',
      PRODUCTS: [],
      BUNDLES: [],
      BOXES: [],
      ADDRESS: {},
      FULL_NAME: 'Test Receiver',
      ORDER_DATE: '2026-01-01',
      GIFT_CHARGES: 0,
      STORE_CREDIT: 0,
      SHIPPING: 0,
      SUBTOTAL: 0,
      TOTAL: 0,
      ...OPTION_KEYS,
    };
    const res = await api.request('/public/contactUs', { method: 'POST', body });
    assert.equal(globalThis[MARKER], undefined, 'no code from the request ran');
    assert.equal(res.status, 200);
    const mails = sentEmails();
    assert.equal(mails.length, 1);
    assert.ok(mails[0].html.includes('TEST-ORDER-2'));
  });
});
