const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

// Boot smoke tests: load the whole Express app (every route, model and SDK client) in this process with placeholder
// config and an unreachable database, then hit it over HTTP. No real database and no network: port 1 on 127.0.0.1
// refuses at once. Loading the app queues no queries (search indexing waits for a connection), so nothing is left
// pending when the tests end.

const API_ROOT = path.join(__dirname, '..');
const DB_HOST = '127.0.0.1:1';

const STUB_ENV = {
  APP_ENV: 'test',
  ENCRYPTION_KEY: 'test-only-key-'.padEnd(32, '0'),
  // Unreachable on purpose; the short server selection timeout turns each connect attempt into a fast failure.
  MONGODB_URI: `mongodb://${DB_HOST}/pageaters_test?serverSelectionTimeoutMS=300`,
  // Placeholders in the shape the SDKs check when they are constructed at import time.
  TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}`,
  TWILIO_AUTH_TOKEN: 'test',
  RAZORPAY_KEY_ID: 'rzp_test_placeholder',
  RAZORPAY_KEY_SECRET: 'test',
  SENDGRID_API_KEY: 'SG.test',
};
Object.assign(process.env, STUB_ENV);

const mongoose = require('mongoose');

// Record listen() and connect() calls made while the app module loads.
const calls = { listen: 0, connect: 0 };
const { listen } = net.Server.prototype;
const { connect } = mongoose;
net.Server.prototype.listen = function (...args) {
  calls.listen += 1;
  return listen.apply(this, args);
};
mongoose.connect = (...args) => {
  calls.connect += 1;
  return connect.apply(mongoose, args);
};
const app = require('../src/app');
const atImport = { ...calls, readyState: mongoose.connection.readyState };
net.Server.prototype.listen = listen;
mongoose.connect = connect;

const logs = [];
const { error: logError } = console;
console.error = (...args) => logs.push(args.join(' '));

let server;
let BASE;

before(async () => {
  server = await new Promise((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  console.error = logError;
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('loading src/app.js neither connects to MongoDB nor listens', () => {
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.handle, 'function');
  assert.deepEqual(atImport, { listen: 0, connect: 0, readyState: 0 });
});

test('GET /api/v1/ answers with the IT_WORKS envelope without the database', async () => {
  const res = await fetch(`${BASE}/api/v1/`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    name: 'API',
    status: 'IT_WORKS',
    message: 'Yes, this is the correct basePath!',
  });
});

test('GET / renders the index page', async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
});

test('OPTIONS preflight is answered by the catch-all route', async () => {
  const res = await fetch(`${BASE}/api/v1/categories`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});

test('unknown routes outside the API answer 404', async () => {
  const res = await fetch(`${BASE}/does-not-exist`);
  assert.equal(res.status, 404);
});

test('database-backed routes answer 503 when MongoDB is unreachable, and retry on the next request', async () => {
  for (const route of ['/api/v1/categories', '/api/v1/auth/me']) {
    const res = await fetch(`${BASE}${route}`, { signal: AbortSignal.timeout(10_000) });
    assert.equal(res.status, 503, route);
    const body = await res.text();
    assert.match(body, /Database unavailable/);
    assert.doesNotMatch(body, new RegExp(DB_HOST.replaceAll('.', '\\.')));
  }
  // Each request made its own attempt (the failed one was not cached), and no log line names the URI.
  const output = logs.join('\n');
  assert.equal(output.match(/MongoDB connection failed/g)?.length, 2);
  assert.doesNotMatch(output, /pageaters_test|serverSelectionTimeoutMS/);
});

test('unknown /api/v1/* paths answer 503 while MongoDB is down (404 once it is up)', async () => {
  // Every /api/v1 path except the health route sits behind requireDb, so the 404 needs a connection first.
  const res = await fetch(`${BASE}/api/v1/does-not-exist`, { signal: AbortSignal.timeout(10_000) });
  assert.equal(res.status, 503);
});

test('src/server.js exits 1 with a clear message on invalid env, without echoing values', () => {
  const fakeLiveKey = 'rzp_live_BOOTFAKEzz9';
  const result = spawnSync(process.execPath, ['src/server.js'], {
    cwd: API_ROOT,
    env: { ...STUB_ENV, PATH: process.env.PATH, RAZORPAY_KEY_ID: fakeLiveKey, ENCRYPTION_KEY: 'BOOTSHORTzz9', MONGODB_URI: '' },
    encoding: 'utf8',
    timeout: 20_000,
  });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 1);
  assert.match(output, /Invalid API environment/);
  assert.match(output, /RAZORPAY_KEY_ID: is a live key/);
  assert.match(output, /ENCRYPTION_KEY: must be exactly 32 bytes/);
  assert.match(output, /MONGODB_URI: is required/);
  assert.doesNotMatch(output, /zz9|BOOT/);
  assert.doesNotMatch(output, /Listening|\n\s+at /);
});

test('src/server.js exits 1 without listening when MongoDB is unreachable', () => {
  const result = spawnSync(process.execPath, ['src/server.js'], {
    cwd: API_ROOT,
    env: { ...STUB_ENV, PATH: process.env.PATH, PORT: '5999' },
    encoding: 'utf8',
    timeout: 20_000,
  });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 1);
  assert.match(output, /MongoDB connection failed/);
  assert.doesNotMatch(output, /Listening|pageaters_test/);
});
