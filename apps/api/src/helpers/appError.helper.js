// Errors that services throw and how they become responses (src/services/README.md).
//
// `code` is a message key from src/locales/en.json (e.g. 'BOOK_NOT_EXIST'); `status` is the HTTP status. Controllers
// catch and call handleControllerError(res, error); the central error handler (middlewares/errorHandler.middleware.js)
// answers whatever reaches next(error) through the same function. It answers through the legacy res.* helpers
// (middlewares/extendReq.middleware.js), so every envelope stays as it was.

class AppError extends Error {
  /**
   * @param {string} code Message key from src/locales/en.json; also the envelope's `status`.
   * @param {object} [options]
   * @param {number} [options.status=400] HTTP status: 400–499 and 503 answer that status, any other 5xx the
   *   generic 500.
   * @param {unknown} [options.data] Envelope `data`. Given → the object-form `res.error({ statusCode, message, data })`
   *   envelope; omitted (with 400) → the string-form `res.error(code)` envelope. The two differ only in key order.
   * @param {string} [options.debugMessage] Second argument of `res.error` (request log only, never sent).
   * @param {unknown} [options.cause] Underlying error, for logs.
   */
  constructor(code, { status = 400, data, debugMessage, cause } = {}) {
    if (typeof code !== 'string' || !code) throw new TypeError('AppError needs a message key');
    if (!Number.isInteger(status) || status < 400 || status > 599) throw new RangeError(`AppError status ${status} is not 4xx/5xx`);
    super(code, { cause });
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.debugMessage = debugMessage;
  }
}

/**
 * A book that can't share the cart with what is already there (services/cart-books.service.js). Not an AppError: it
 * answers the legacy PRODUCT_ITEM_MISMATCH body, whose message is this human-readable text (no message key).
 */
class ProductMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductMismatchError';
  }
}

/**
 * Answers an error with the legacy envelope:
 * - AppError 401 → `res.unauthorized(code)`; 403 → `res.forbidden()` (always says FORBIDDEN);
 * - AppError 400 without `data` → `res.error(code, debugMessage)`;
 * - other AppError 4xx or 503, or 400 with `data` → `res.error({ statusCode, message: code, data }, debugMessage)`;
 * - ProductMismatchError → 400 PRODUCT_ITEM_MISMATCH with its text as `message` and `error`;
 * - other AppError 5xx and anything else → `res.internalServerError(error)` (500 SOME_ERROR_OCCURRED, logged as a
 *   summary only).
 * @param {import('express').Response} res
 * @param {unknown} error
 */
const handleControllerError = (res, error) => {
  if (error instanceof ProductMismatchError) {
    return res
      .status(400)
      .send({ statusCode: 400, status: 'PRODUCT_ITEM_MISMATCH', error: error.message, message: error.message, data: {} });
  }
  if (!(error instanceof AppError) || (error.status >= 500 && error.status !== 503)) return res.internalServerError(error);

  const { code, status, data, debugMessage } = error;
  if (status === 401) return res.unauthorized(code);
  if (status === 403) return res.forbidden();
  if (status === 400 && data === undefined) return res.error(code, debugMessage);
  return res.error({ statusCode: status, message: code, data }, debugMessage);
};

module.exports = { AppError, ProductMismatchError, handleControllerError };
