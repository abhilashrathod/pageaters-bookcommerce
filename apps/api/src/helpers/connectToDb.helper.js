const mongoose = require('mongoose');

const { MONGODB_URL } = require('../appConfig');
const { logger } = require('./logger.helper');

// Every query filter is sanitised: a value that is an object with `$` keys (e.g. `{ $ne: null }` from a query string
// or JSON body merged by req.allParams()) is matched as a literal (`$eq`), never run as an operator. Server code that
// builds an operator itself wraps it in mongoose.trusted(); each use is listed in the PLAN.md 7a report.
mongoose.set('sanitizeFilter', true);

// One shared connection promise per process. Concurrent callers wait on the same attempt; a warm serverless
// instance or the local server reuses it, also through a transient `disconnected` state, because the driver
// reconnects by itself (calling mongoose.connect again then would open a second client and leak the first).
// A failed attempt, or a deliberate close (mongoose.disconnect / connection.close), clears the cache so the next
// call connects again.
let connecting;

mongoose.connection.on('close', () => {
  connecting = undefined;
});

// Error text for logs: never the URI or its credentials.
const describe = (error) => {
  const message = String(error?.message ?? '')
    .split(MONGODB_URL)
    .join('<MONGODB_URI>')
    .replace(/\/\/[^/@\s]+@/g, '//<credentials>@');
  return `${error?.name ?? 'Error'}: ${message}`;
};

const connectToDb = () => {
  if (!connecting) {
    const attempt = mongoose.connect(MONGODB_URL).then(
      (instance) => {
        logger.info('Connected to MongoDB');
        return instance;
      },
      (error) => {
        if (connecting === attempt) connecting = undefined;
        logger.error(`MongoDB connection failed (${describe(error)})`);
        throw error;
      },
    );
    connecting = attempt;
  }
  return connecting;
};

module.exports = connectToDb;
module.exports.describe = describe;
