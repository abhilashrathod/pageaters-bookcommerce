const { AppError, handleControllerError } = require('../helpers/appError.helper');
const { logger } = require('../helpers/logger.helper');
const messages = require('../locales/en.json');

// The app's last two middlewares (src/app.js): a JSON 404 for any unmatched route, and the one error handler for
// whatever reaches next(error). Both answer through handleControllerError (helpers/appError.helper.js), the mapping
// the controllers use, so every error gets the same legacy envelope and never Express's HTML page or a stack trace.

// body-parser's client errors (express.json) with their own code, by `type`: a body over the limit, malformed JSON.
const BODY_ERRORS = {
  'entity.too.large': 'REQUEST_TOO_LARGE',
  'entity.parse.failed': 'INVALID_JSON',
};

// Errors that describe the request, not a failure: http-errors that may be exposed (body-parser's) and the router's
// URIError for a path with malformed percent-encoding. Any other error with a 4xx `status` (a vendor's, kept by
// adapters/vendor-error.js) is a failure of ours and answers 500.
const isClientError = (error) =>
  (error?.expose === true || error instanceof URIError) && Number.isInteger(error.status) && error.status >= 400 && error.status < 500;

/**
 * An error as handleControllerError answers it: a client error (isClientError) becomes an AppError with its status,
 * by its own code or INVALID_REQUEST (a malformed body answers the string-form 400); everything else is passed
 * through.
 * @param {unknown} error
 * @returns {unknown}
 */
const toAnswerable = (error) => {
  if (error instanceof AppError || !isClientError(error)) return error;
  return new AppError(BODY_ERRORS[error.type] ?? 'INVALID_REQUEST', { status: error.status });
};

/** Unmatched routes: 404 NOT_FOUND in the legacy envelope. */
const notFound = (req, res, next) => next(new AppError('NOT_FOUND', { status: 404 }));

/**
 * Express error middleware (Express recognises it by its four arguments). A response already under way can't change
 * its status: Express's own handler then closes the connection. An error raised before the response helpers exist
 * (middlewares/extendReq.middleware.js) answers the same 500 envelope directly.
 */
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (typeof res.internalServerError !== 'function') {
    (req.log ?? logger).error({ err: error }, 'request failed');
    const message = messages.SOME_ERROR_OCCURRED;
    return res.status(500).json({ statusCode: 500, status: 'SOME_ERROR_OCCURRED', message, error: message, data: {} });
  }
  return handleControllerError(res, toAnswerable(error));
};

module.exports = { errorHandler, notFound };
