const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const { TEST_ENV } = require('./helpers/env');
const { captureLogs, messagesAt } = require('./helpers/logs');

// Boot smoke tests: load the whole Express app (every route, model and SDK client) in this process with placeholder
// config and an unreachable database, then hit it over HTTP. No real database and no network: port 1 on 127.0.0.1
// refuses at once. Loading the app queues no queries, so nothing is left pending when the
// tests end.

const API_ROOT = path.join(__dirname, '..');
const DB_HOST = '127.0.0.1:1';

const STUB_ENV = {
  ...TEST_ENV,
  // Unreachable on purpose; the short server selection timeout turns each connect attempt into a fast failure.
  MONGODB_URI: `mongodb://${DB_HOST}/pageaters_test?serverSelectionTimeoutMS=300`,
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

const logs = captureLogs();
const messages = require('../src/locales/en.json');

let server;
let BASE;

before(async () => {
  server = await new Promise((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
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

// 7a: the one cors() setup answers preflights (204; was 200 from a catch-all OPTIONS route).
test('OPTIONS preflight from an allowed origin is answered by cors()', async () => {
  const res = await fetch(`${BASE}/api/v1/categories`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000' },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});

test('unknown routes outside the API answer 404 in the JSON envelope', async () => {
  const res = await fetch(`${BASE}/does-not-exist`);
  assert.equal(res.status, 404);
  assert.equal(
    JSON.stringify(await res.json()),
    JSON.stringify({ statusCode: 404, status: 'NOT_FOUND', message: messages.NOT_FOUND, error: messages.NOT_FOUND, data: {} }),
  );
});

test('GET /health tries to connect and answers 503 unavailable when MongoDB is unreachable, saying nothing why', async () => {
  const before = logs.length;
  const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(10_000) });
  assert.equal(res.status, 503);
  assert.equal(await res.text(), JSON.stringify({ status: 'unavailable' }));
  assert.equal(res.headers.get('cache-control'), 'no-store');
  // It made the shared connection attempt (logged without the URI), like a cold instance's first request.
  const logged = messagesAt(logs.slice(before));
  assert.equal(logged.length, 1);
  assert.match(logged[0], /^MongoDB connection failed \(/);
  assert.doesNotMatch(logged[0], /pageaters_test/);
});

test('database-backed routes answer 503 when MongoDB is unreachable, and retry on the next request', async () => {
  const before = logs.length;
  for (const route of ['/api/v1/categories', '/api/v1/auth/me']) {
    const res = await fetch(`${BASE}${route}`, { signal: AbortSignal.timeout(10_000) });
    assert.equal(res.status, 503, route);
    const body = await res.text();
    assert.equal(
      body,
      JSON.stringify({
        statusCode: 503,
        status: 'DATABASE_UNAVAILABLE',
        message: messages.DATABASE_UNAVAILABLE,
        error: messages.DATABASE_UNAVAILABLE,
        data: {},
      }),
    );
    assert.doesNotMatch(body, new RegExp(DB_HOST.replaceAll('.', '\\.')));
  }
  // Each request made its own attempt (the failed one was not cached), and no log line names the URI.
  const output = logs
    .slice(before)
    .map((entry) => JSON.stringify(entry))
    .join('\n');
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
    env: { ...STUB_ENV, PATH: process.env.PATH, PORT: '5999', LOG_LEVEL: 'info' },
    encoding: 'utf8',
    timeout: 20_000,
  });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 1);
  assert.match(output, /MongoDB connection failed/);
  assert.doesNotMatch(output, /Listening|pageaters_test/);
});

// Process-level logging (helpers/logger.helper.js logProcessErrors), installed by loading src/app.js.
const runWithApp = (script) =>
  spawnSync(process.execPath, ['-e', `require('./src/app'); ${script}`], {
    cwd: API_ROOT,
    env: { ...STUB_ENV, PATH: process.env.PATH, LOG_LEVEL: 'info' },
    encoding: 'utf8',
    timeout: 20_000,
  });

const logLines = (stdout) =>
  stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));

test('an unhandled rejection is logged without its message, and the process keeps running', () => {
  const result = runWithApp(
    "Promise.reject(new Error('lost write for reader@example.com')); setTimeout(() => process.stdout.write('still running'), 50);",
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /still running/);
  const lines = logLines(result.stdout);
  const [entry] = lines.filter((line) => line.msg === 'Unhandled promise rejection');
  assert.deepEqual([entry.level, entry.err.type], ['error', 'Error']);
  assert.doesNotMatch(JSON.stringify(lines), /reader@example\.com/);
});

test('an uncaught exception is logged as fatal, then Node exits as it would without the logger', () => {
  const result = runWithApp("setTimeout(() => { throw new TypeError('boom'); }, 0);");
  assert.equal(result.status, 1);
  const [entry] = logLines(result.stdout).filter((line) => line.msg === 'Uncaught exception');
  assert.deepEqual([entry.level, entry.err.type, entry.err.message], ['fatal', 'TypeError', 'boom']);
});
