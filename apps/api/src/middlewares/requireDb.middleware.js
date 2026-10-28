const connectToDb = require('../helpers/connectToDb.helper');

// Waits for the shared MongoDB connection before database-backed routes, so the exported app works without
// src/server.js: a cold serverless instance connects on its first request and warm instances reuse the connection.
// A failed connection becomes a 503 for the error handler; the original error (which can name the host) stays in
// `cause` and is never sent to the client.
module.exports = async (req, res, next) => {
  try {
    await connectToDb();
  } catch (cause) {
    const error = new Error('Database unavailable', { cause });
    error.status = 503;
    return next(error);
  }
  return next();
};
