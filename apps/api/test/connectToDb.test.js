const { beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Placeholder config for appConfig; mongoose.connect and readyState are replaced below, so nothing connects.
const URI = 'mongodb://dbuser:SECRETPASSqq7@127.0.0.1:1/pageaters_test';
Object.assign(process.env, {
  APP_ENV: 'test',
  MONGODB_URI: URI,
  ENCRYPTION_KEY: 'k'.repeat(32),
  RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123',
  TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}`,
  TWILIO_AUTH_TOKEN: 'fake-twilio-token',
});

const HELPER = '../src/helpers/connectToDb.helper';
const MIDDLEWARE = '../src/middlewares/requireDb.middleware';

let calls;
let outcomes;
let readyState;
const logs = [];
console.log = (line) => logs.push(line);
console.error = (line) => logs.push(line);

Object.defineProperty(mongoose.connection, 'readyState', { get: () => readyState, configurable: true });
mongoose.connect = (uri) => {
  calls.push(uri);
  const outcome = outcomes.shift();
  if (outcome instanceof Error) return Promise.reject(outcome);
  readyState = 1;
  return Promise.resolve(mongoose);
};

const refused = () =>
  Object.assign(new Error(`connect ECONNREFUSED while opening ${URI}`), { name: 'MongooseServerSelectionError' });

// Fresh modules per test, so the helper's cache starts empty.
const load = () => {
  for (const file of [HELPER, MIDDLEWARE]) delete require.cache[require.resolve(file)];
  return { connectToDb: require(HELPER), requireDb: require(MIDDLEWARE) };
};

beforeEach(() => {
  calls = [];
  outcomes = [];
  readyState = 0;
  logs.length = 0;
});

describe('connectToDb', () => {
  test('a failed attempt is not cached: the next call retries, then the success is shared', async () => {
    const { connectToDb } = load();
    outcomes = [refused(), 'ok'];

    const first = connectToDb();
    assert.equal(connectToDb(), first, 'concurrent callers share one attempt');
    await assert.rejects(first, /ECONNREFUSED/);

    const second = connectToDb();
    assert.notEqual(second, first);
    await second;
    assert.equal(connectToDb(), second, 'the connected promise is reused');
    await connectToDb();

    assert.deepEqual(calls, [URI, URI]);
  });

  test('keeps the connection through a transient disconnect, and connects again only after a close', async () => {
    const { connectToDb } = load();
    outcomes = ['ok', 'ok'];

    const first = connectToDb();
    await first;
    // A network blip: Mongoose reports disconnected while the driver reconnects the same client by itself.
    readyState = 0;
    assert.equal(connectToDb(), first);
    readyState = 2;
    assert.equal(connectToDb(), first);
    assert.equal(calls.length, 1);

    // A deliberate close (mongoose.disconnect / connection.close) clears the cache.
    readyState = 0;
    mongoose.connection.emit('close');
    const second = connectToDb();
    assert.notEqual(second, first);
    await second;
    assert.equal(calls.length, 2);
  });

  test('logs the failure without the URI or its credentials', () => {
    const { connectToDb } = load();
    const line = connectToDb.describe(refused());
    assert.match(line, /MongooseServerSelectionError: connect ECONNREFUSED/);
    assert.doesNotMatch(line, /SECRETPASS|dbuser|pageaters_test/);
    assert.match(
      connectToDb.describe(new Error('auth failed for mongodb://a:SECRETPASSqq7@host/db')),
      /\/\/<credentials>@host/,
    );
  });
});

describe('requireDb middleware', () => {
  test('passes a 503 error to next() when the connection fails, keeping the cause off the message', async () => {
    const { requireDb } = load();
    outcomes = [refused()];

    const error = await new Promise((resolve) => requireDb({}, {}, resolve));
    assert.equal(error.status, 503);
    assert.equal(error.message, 'Database unavailable');
    assert.match(error.cause.message, /ECONNREFUSED/);
    assert.ok(logs.some((line) => /MongoDB connection failed/.test(line)));
    assert.ok(logs.every((line) => !line.includes('SECRETPASS')));
  });

  test('connects once on the first request, then calls next() with no error', async () => {
    const { requireDb } = load();
    outcomes = ['ok'];

    for (let i = 0; i < 2; i += 1) {
      const args = await new Promise((resolve) => requireDb({}, {}, (...received) => resolve(received)));
      assert.deepEqual(args, []);
    }
    assert.deepEqual(calls, [URI]);
  });
});
