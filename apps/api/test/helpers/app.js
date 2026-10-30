const mongoose = require('mongoose');

const { DB_NAME, DB_PORT } = require('./setup');
const { clearDb, startMemoryDb, stopMemoryDb } = require('./db');
const { settleDbOperations, trackDbOperations } = require('./settle');
const { clearOutbox } = require('./outbox');
const { clearVendorMocks } = require('./stubs');

// Runs the real Express app over HTTP against an in-memory MongoDB, with vendor SDKs stubbed and the network
// limited to this machine (both set up by ./setup when ./helpers is first required). Usage, one per test file
// (node --test gives each file its own process):
//
//   const api = await startTestApp();      // in before()
//   await loadCatalog();                   // shared fixtures (test/helpers/fixtures/catalog.js)
//   const res = await api.request('/favorites', { cookie });
//   await api.reset();                     // in beforeEach(): empty collections, clear vendor mocks and the outbox
//   await api.stop();                      // in after(): waits for unawaited writes, then closes
//
// Paths are relative to /api/v1. Console output from the legacy code (morgan is off under APP_ENV=test, but
// res.error logs every request it rejects) is muted; set TEST_LOGS=1 to see it.

/**
 * @returns {Promise<{
 *   app: import('express').Express,
 *   baseUrl: string,
 *   request: (path: string, options?: { method?: string, body?: unknown, cookie?: string }) =>
 *     Promise<{ status: number, body: any, headers: Headers }>,
 *   reset: () => Promise<void>,
 *   stop: () => Promise<void>,
 * }>}
 */
const startTestApp = async () => {
  await startMemoryDb({ port: DB_PORT, dbName: DB_NAME });

  const { log, info } = console;
  if (!process.env.TEST_LOGS) {
    console.log = () => {};
    console.info = () => {};
  }

  trackDbOperations();
  const app = require('../../src/app');
  // The rate limits are on in the app; every request here comes from 127.0.0.1 (security-perimeter.test.js turns
  // them back on to test them).
  require('../../src/middlewares/rateLimit.middleware').settings.enabled = false;
  await require('../../src/helpers/connectToDb.helper')();

  const server = await new Promise((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const request = async (path, { method = 'GET', body, cookie } = {}) => {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // not JSON: keep the text
    }
    return { status: res.status, body: parsed, headers: res.headers };
  };

  return {
    app,
    baseUrl,
    request,
    reset: async () => {
      clearVendorMocks();
      clearOutbox();
      await clearDb(mongoose.connection);
    },
    // Waits for the writes the legacy code doesn't await (the request log of res.error and friends, unawaited
    // saves) so none of them runs into a closed connection, then stops the server and the database.
    stop: async () => {
      await settleDbOperations();
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await stopMemoryDb();
      Object.assign(console, { log, info });
    },
  };
};

module.exports = { startTestApp };
