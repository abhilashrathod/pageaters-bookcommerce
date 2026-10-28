const mongoose = require('mongoose');

const { MONGODB_URL } = require('../appConfig');

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
        console.log('Connected to MongoDB');
        return instance;
      },
      (error) => {
        if (connecting === attempt) connecting = undefined;
        console.error(`MongoDB connection failed (${describe(error)})`);
        throw error;
      },
    );
    connecting = attempt;
  }
  return connecting;
};

module.exports = connectToDb;
module.exports.describe = describe;
