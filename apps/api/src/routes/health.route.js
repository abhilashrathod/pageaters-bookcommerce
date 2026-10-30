const mongoose = require('mongoose');

const connectToDb = require('../helpers/connectToDb.helper');

// GET /health (src/app.js): public, not behind requireDb, so it answers while the database is down. It waits for the
// shared connection (helpers/connectToDb.helper.js: a warm instance has it already, a cold one connects as its first
// database-backed request would) for at most CONNECT_TIMEOUT_MS, then pings within PING_TIMEOUT_MS. Both succeed →
// 200 `{ status: 'ok' }`; anything else → 503 `{ status: 'unavailable' }`. The body never says why: no version,
// environment, host or error. A connection attempt that outlives the check carries on, shared with the next request.

const CONNECTED = 1;
const CONNECT_TIMEOUT_MS = 2500;
const PING_TIMEOUT_MS = 1000;

/**
 * Settles like `promise`, or rejects after `ms`.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
const within = (promise, ms) => {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const isDatabaseUp = async () => {
  try {
    await within(connectToDb(), CONNECT_TIMEOUT_MS);
    // Connected once, but the driver may be reconnecting (a transient disconnect): not up right now.
    if (mongoose.connection.readyState !== CONNECTED) return false;
    await within(mongoose.connection.db.command({ ping: 1 }, { timeoutMS: PING_TIMEOUT_MS }), PING_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
};

/** @type {import('express').RequestHandler} */
module.exports = async (req, res) => {
  const up = await isDatabaseUp();
  res.set('Cache-Control', 'no-store');
  return res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'unavailable' });
};
