const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

// Boot smoke test: load the whole Express app (every route, model and SDK client) in a child process with
// placeholder config and no database, then hit routes that answer without MongoDB.
// The child is killed afterwards, so nothing stays open (database queries would only buffer).

const API_ROOT = path.join(__dirname, '..');
const PORT = 5990 + Math.floor(Math.random() * 9);
const BASE = `http://127.0.0.1:${PORT}`;

const STUB_ENV = {
  PATH: process.env.PATH,
  APP_ENV: 'test',
  ENABLE_CRON: 'false',
  ENCRYPTION_KEY: 'test-only-key-'.padEnd(32, '0'),
  // Never connected to: the app is loaded without startServer().
  MONGODB_URI: 'mongodb://127.0.0.1:1/pageaters_test',
  // Placeholders in the shape the SDKs check when they are constructed at import time.
  TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}`,
  TWILIO_AUTH_TOKEN: 'test',
  RAZORPAY_KEY_ID: 'rzp_test_placeholder',
  RAZORPAY_KEY_SECRET: 'test',
  SENDGRID_API_KEY: 'SG.test',
};

// Loading the app starts the search indexing, whose queries buffer while there is no connection. Mongoose
// rejects buffered queries after 10 s and the indexing then exits the process, which a slow CI run could hit.
// Only this test child raises the buffer timeout, so the queries just wait until the child is killed.
const LISTEN = [
  "require('mongoose').set('bufferTimeoutMS', 10 * 60 * 1000);",
  `require('./src/app').app.listen(${PORT}, '127.0.0.1', () => console.log('READY'));`,
].join('\n');

let child;

before(async () => {
  child = spawn(process.execPath, ['-e', LISTEN], { cwd: API_ROOT, env: STUB_ENV, stdio: ['ignore', 'pipe', 'pipe'] });

  let output = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`API did not start:\n${output}`)), 20_000);
    const onData = (chunk) => {
      output += chunk;
      if (output.includes('READY')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => (output += chunk));
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`API exited with code ${code}:\n${output}`));
    });
  });
});

after(() => {
  child?.kill();
});

test('GET /api/v1/ answers with the IT_WORKS envelope', async () => {
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

test('an authenticated route answers 401 without a session cookie', async () => {
  const res = await fetch(`${BASE}/api/v1/auth/me`);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.statusCode, 401);
  assert.equal(body.status, 'UNAUTHORIZED');
});

test('OPTIONS preflight is answered by the catch-all route', async () => {
  const res = await fetch(`${BASE}/api/v1/categories`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});

test('unknown routes answer 404', async () => {
  const res = await fetch(`${BASE}/api/v1/does-not-exist`);
  assert.equal(res.status, 404);
});

test('index.js exits non-zero with a clear message on invalid env, without echoing values', () => {
  const fakeLiveKey = 'rzp_live_BOOTFAKEzz9';
  const result = spawnSync(process.execPath, ['index.js'], {
    cwd: API_ROOT,
    env: { ...STUB_ENV, RAZORPAY_KEY_ID: fakeLiveKey, ENCRYPTION_KEY: 'BOOTSHORTzz9', MONGODB_URI: '' },
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
  assert.doesNotMatch(output, /starting app|\n\s+at /);
});
