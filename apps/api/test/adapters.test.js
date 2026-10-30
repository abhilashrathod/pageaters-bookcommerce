const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

require('./helpers');

// The email and SMS adapters (src/adapters): each real adapter maps the interface onto its vendor SDK and refuses
// to start without its keys; the mocks record without sending; the selectors load only the chosen implementation.
// The vendor SDK modules are replaced here by recording fakes (no network: ./helpers also blocks it).

const API_ROOT = path.join(__dirname, '..');

// A vendor error that quotes the recipient, as Twilio's do; adapters must not pass its message or itself on.
const leakyError = (fields) => Object.assign(new Error("The 'To' number +919000000042 / reader@example.com is not valid"), fields);

// Puts `exports` in the require cache in place of a vendor module, for adapters created after this call.
const fakeModule = (request, exports) => {
  const filename = require.resolve(request, { paths: [API_ROOT] });
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

const fakeSendgrid = () => {
  const calls = { setApiKey: [], setTimeout: [], send: [] };
  fakeModule('@sendgrid/mail', {
    setApiKey: (key) => calls.setApiKey.push(key),
    setTimeout: (ms) => calls.setTimeout.push(ms),
    send: async (mail) => {
      calls.send.push(mail);
      return [{ statusCode: 202 }];
    },
  });
  return calls;
};

const fakeTwilio = () => {
  const calls = { client: [], create: [] };
  fakeModule('twilio', (accountSid, authToken, options) => {
    calls.client.push([accountSid, authToken, options]);
    return {
      messages: {
        create: async (message) => {
          calls.create.push(message);
          return { sid: 'SM-test' };
        },
      },
    };
  });
  return calls;
};

const sendgrid = require('../src/adapters/email/sendgrid');
const twilio = require('../src/adapters/sms/twilio');
const emailMock = require('../src/adapters/email/mock');
const smsMock = require('../src/adapters/sms/mock');

const MAIL = { from: 'sender@example.com', to: 'reader@example.com', subject: 'Hello', html: '<p>Hi</p>' };
const TWILIO_CONFIG = { accountSid: `AC${'1'.repeat(32)}`, authToken: 'fake-token', from: '+15005550006' };

describe('SendGrid email adapter', () => {
  test('sets the key once and sends from/to/subject/html', async () => {
    const calls = fakeSendgrid();
    const adapter = sendgrid.create({ apiKey: 'SG.fake' });
    assert.equal(adapter.name, 'sendgrid');
    assert.deepEqual(calls.setApiKey, ['SG.fake']);
    assert.deepEqual(calls.setTimeout, [10_000], 'every call is bounded');

    assert.equal(await adapter.send({ ...MAIL, extra: 'ignored' }), undefined);
    assert.deepEqual(calls.send, [MAIL]);
  });

  test('rejects with a clean error carrying only the code when SendGrid rejects', async () => {
    fakeModule('@sendgrid/mail', {
      setApiKey: () => {},
      setTimeout: () => {},
      send: async () => {
        throw leakyError({ code: 400, response: { body: { errors: [{ message: 'reader@example.com' }] } } });
      },
    });
    await assert.rejects(sendgrid.create({ apiKey: 'SG.fake' }).send(MAIL), (error) => {
      assert.equal(error.message, 'Email send failed');
      assert.equal(error.code, 400);
      assert.deepEqual(Object.keys(error).sort(), ['code']);
      assert.equal(error.cause, undefined);
      assert.doesNotMatch(String(error.stack), /reader@example\.com|\+91/);
      return true;
    });
  });

  test('refuses to start without SENDGRID_API_KEY, before touching the SDK', () => {
    const calls = fakeSendgrid();
    for (const config of [undefined, {}, { apiKey: '' }]) {
      assert.throws(() => sendgrid.create(config), { message: 'The SendGrid email adapter needs SENDGRID_API_KEY' });
    }
    assert.deepEqual(calls.setApiKey, []);
  });
});

describe('Twilio SMS adapter', () => {
  test('builds the client with the account credentials and sends body/from/to', async () => {
    const calls = fakeTwilio();
    const adapter = twilio.create(TWILIO_CONFIG);
    assert.equal(adapter.name, 'twilio');
    assert.deepEqual(calls.client, [[TWILIO_CONFIG.accountSid, 'fake-token', { timeout: 10_000 }]]);

    assert.equal(await adapter.send({ to: '+919000000042', body: 'Hi' }), undefined);
    assert.deepEqual(calls.create, [{ body: 'Hi', from: '+15005550006', to: '+919000000042' }]);
  });

  test('rejects with a clean error carrying only code and status when Twilio rejects', async () => {
    fakeModule('twilio', () => ({
      messages: {
        create: async () => {
          throw leakyError({ status: 400, code: 21211, moreInfo: 'https://www.twilio.com/docs/errors/21211' });
        },
      },
    }));
    await assert.rejects(twilio.create(TWILIO_CONFIG).send({ to: '+919000000042', body: 'Hi' }), (error) => {
      assert.equal(error.message, 'SMS send failed');
      assert.deepEqual({ code: error.code, status: error.status }, { code: 21211, status: 400 });
      assert.deepEqual(Object.keys(error).sort(), ['code', 'status']);
      assert.equal(error.cause, undefined);
      assert.doesNotMatch(String(error.stack), /reader@example\.com|\+91/);
      return true;
    });
  });

  test('a network error keeps only a short code', async () => {
    fakeModule('twilio', () => ({
      messages: {
        create: async () => {
          throw leakyError({ code: 'ETIMEDOUT' });
        },
      },
    }));
    await assert.rejects(twilio.create(TWILIO_CONFIG).send({ to: '+919000000042', body: 'Hi' }), {
      message: 'SMS send failed',
      code: 'ETIMEDOUT',
    });
  });

  test('refuses to start without its keys, naming each missing one and no value', () => {
    const calls = fakeTwilio();
    assert.throws(() => twilio.create(), { message: 'The Twilio SMS adapter needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE' });
    assert.throws(() => twilio.create({ ...TWILIO_CONFIG, authToken: '' }), { message: 'The Twilio SMS adapter needs TWILIO_AUTH_TOKEN' });
    assert.throws(
      () => twilio.create({ ...TWILIO_CONFIG, from: undefined }),
      (error) => {
        assert.equal(error.message, 'The Twilio SMS adapter needs TWILIO_PHONE');
        assert.equal(error.message.includes(TWILIO_CONFIG.accountSid), false);
        return true;
      },
    );
    assert.deepEqual(calls.client, []);
  });
});

describe('mock adapters', () => {
  test('the email mock records each message in order until cleared', async () => {
    emailMock.clear();
    await emailMock.send({ ...MAIL, extra: 'ignored' });
    await emailMock.send({ ...MAIL, subject: 'Second' });
    const list = emailMock.list();
    assert.deepEqual(list, [MAIL, { ...MAIL, subject: 'Second' }]);
    list.pop();
    assert.equal(emailMock.list().length, 2, 'list() is a copy');
    assert.ok(Object.isFrozen(list[0]));
    emailMock.clear();
    assert.deepEqual(emailMock.list(), []);
  });

  test('the SMS mock records each text in order until cleared', async () => {
    smsMock.clear();
    await smsMock.send({ to: '+919000000042', body: 'Hi', from: 'ignored' });
    assert.deepEqual(smsMock.list(), [{ to: '+919000000042', body: 'Hi' }]);
    smsMock.clear();
    assert.deepEqual(smsMock.list(), []);
  });

  test('the mocks keep only the newest 50 messages', async () => {
    emailMock.clear();
    smsMock.clear();
    for (let i = 1; i <= 55; i += 1) {
      await emailMock.send({ ...MAIL, subject: `Mail ${i}` });
      await smsMock.send({ to: '+919000000042', body: `Text ${i}` });
    }
    const mails = emailMock.list();
    const texts = smsMock.list();
    assert.equal(mails.length, 50);
    assert.equal(texts.length, 50);
    assert.deepEqual([mails[0].subject, mails.at(-1).subject], ['Mail 6', 'Mail 55']);
    assert.deepEqual([texts[0].body, texts.at(-1).body], ['Text 6', 'Text 55']);
    emailMock.clear();
    smsMock.clear();
  });

  test('the mocks never write to the console', async (t) => {
    const writes = ['log', 'info', 'warn', 'error', 'debug'].map((method) => t.mock.method(console, method, () => {}));
    await emailMock.send(MAIL);
    await smsMock.send({ to: '+919000000042', body: 'Hi' });
    assert.equal(
      writes.reduce((count, spy) => count + spy.mock.callCount(), 0),
      0,
    );
    emailMock.clear();
    smsMock.clear();
  });
});

describe('adapter selection', () => {
  test('the test env selects the mocks', () => {
    assert.equal(require('../src/adapters/email'), emailMock);
    assert.equal(require('../src/adapters/sms'), smsMock);
  });

  // A fresh process per environment: src/env.js validates once per process. The child only builds the adapters
  // (setApiKey and the Twilio client constructor make no network call) and reports which SDK modules it loaded.
  const select = (vars) => {
    const script = `
      const email = require('./src/adapters/email');
      const sms = require('./src/adapters/sms');
      const loaded = (request) => Boolean(require.cache[require.resolve(request)]);
      process.stdout.write(JSON.stringify({ email: email.name, sms: sms.name, sendgrid: loaded('@sendgrid/mail'), twilio: loaded('twilio') }));
    `;
    const env = {
      PATH: process.env.PATH,
      MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
      ENCRYPTION_KEY: 'k'.repeat(32),
      RAZORPAY_KEY_ID: 'rzp_test_placeholder',
      ...vars,
    };
    return JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: API_ROOT, env, encoding: 'utf8' }));
  };

  test('defaults to the mocks without loading a vendor SDK', () => {
    assert.deepEqual(select({}), { email: 'mock', sms: 'mock', sendgrid: false, twilio: false });
  });

  test('loads a real adapter only when it is selected', () => {
    assert.deepEqual(select({ EMAIL_ADAPTER: 'sendgrid', SENDGRID_API_KEY: 'SG.fake', MAIL_FROM: 'sender@example.com' }), {
      email: 'sendgrid',
      sms: 'mock',
      sendgrid: true,
      twilio: false,
    });
    assert.deepEqual(
      select({
        SMS_ADAPTER: 'twilio',
        TWILIO_ACCOUNT_SID: `AC${'1'.repeat(32)}`,
        TWILIO_AUTH_TOKEN: 'fake-token',
        TWILIO_PHONE: '+15005550006',
      }),
      { email: 'mock', sms: 'twilio', sendgrid: false, twilio: true },
    );
  });
});
