const mongoose = require('mongoose');

const { DB_NAME, DB_PORT } = require('./setup');
const { clearDb, startMemoryDb, stopMemoryDb } = require('./db');
const { clearVendorMocks } = require('./stubs');

// Runs the real Express app over HTTP against an in-memory MongoDB, with vendor SDKs stubbed and the network
// limited to this machine (both set up by ./setup when ./helpers is first required). Usage, one per test file
// (node --test gives each file its own process):
//
//   const api = await startTestApp();      // in before()
//   await loadCatalog(); await api.reindex();   // fixtures, then the lunr search indexes if the test searches
//   const res = await api.request('/favorites', { cookie });
//   await api.reset();                     // in beforeEach(): empty collections, clear vendor mocks
//   await api.stop();                      // in after()
//
// Paths are relative to /api/v1. Console output from the legacy code (morgan is off under APP_ENV=test, but
// res.error logs every request it rejects) is muted; set TEST_LOGS=1 to see it.

/**
 * @returns {Promise<{
 *   app: import('express').Express,
 *   baseUrl: string,
 *   request: (path: string, options?: { method?: string, body?: unknown, cookie?: string }) =>
 *     Promise<{ status: number, body: any, headers: Headers }>,
 *   reindex: () => Promise<void>,
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

  const app = require('../../src/app');
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
    // Rebuilds the lunr search indexes from what is in the database now (they build once on connect, when the
    // database is still empty). Await it after loading fixtures in tests that hit a search endpoint.
    reindex: () => require('../../src/libs/indexing').runIndexing(app),
    reset: async () => {
      clearVendorMocks();
      await clearDb(mongoose.connection);
    },
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await stopMemoryDb();
      Object.assign(console, { log, info });
    },
  };
};

module.exports = { startTestApp };
