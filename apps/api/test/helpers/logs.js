const pino = require('pino');

// Reads what the API logs. The app logger (src/helpers/logger.helper.js) is silent under APP_ENV=test; captureLogs
// raises it to `trace` and points it at an array instead of stdout, so a test can assert on the parsed JSON lines.
// Per-request child loggers (`req.log`) inherit the destination when they are created, so start capturing before
// the request. Require it after ./setup (or ./index), which applies the test env.

/**
 * Captures the app logger's output until the test ends (`t` given) or for the rest of the process.
 * @param {import('node:test').TestContext} [t]
 * @returns {Array<Record<string, any>>} The parsed log lines, in order (`level` is the label, e.g. 'error').
 */
const captureLogs = (t) => {
  const { logger } = require('../../src/helpers/logger.helper');
  const { streamSym } = pino.symbols;
  const entries = [];
  const previous = { stream: logger[streamSym], level: logger.level };
  logger[streamSym] = { write: (line) => entries.push(JSON.parse(line)) };
  logger.level = 'trace';
  t?.after(() => {
    logger[streamSym] = previous.stream;
    logger.level = previous.level;
  });
  return entries;
};

/**
 * The messages of the captured lines at `level`.
 * @param {Array<Record<string, any>>} entries From captureLogs.
 * @param {string} [level='error']
 * @returns {string[]}
 */
const messagesAt = (entries, level = 'error') => entries.filter((entry) => entry.level === level).map((entry) => entry.msg);

module.exports = { captureLogs, messagesAt };
