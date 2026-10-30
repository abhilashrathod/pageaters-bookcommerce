const connectToDb = require('../helpers/connectToDb.helper');
const { AppError } = require('../helpers/appError.helper');

// Waits for the shared MongoDB connection before database-backed routes, so the exported app works without
// src/server.js: a cold serverless instance connects on its first request and warm instances reuse the connection.
// A failed connection answers 503 DATABASE_UNAVAILABLE through the error handler; the original error (which can name
// the host) stays in `cause` and is never sent to the client.
module.exports = async (req, res, next) => {
  try {
    await connectToDb();
  } catch (cause) {
    return next(new AppError('DATABASE_UNAVAILABLE', { status: 503, cause }));
  }
  return next();
};
