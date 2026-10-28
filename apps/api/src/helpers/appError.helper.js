// Errors that services throw and controllers turn into responses (src/services/README.md).
//
// `code` is a message key from src/locales/en.json (e.g. 'BOOK_NOT_EXIST'); `status` is the HTTP status. Until the
// central error handler (Phase 4 step 9), controllers catch and call handleControllerError(res, error), which answers
// through the existing res.* helpers (middlewares/extendReq.middleware.js), so every envelope stays as it was.

class AppError extends Error {
  /**
   * @param {string} code Message key from src/locales/en.json; also the envelope's `status`.
   * @param {object} [options]
   * @param {number} [options.status=400] HTTP status: 400–499 answers that status, 500+ the generic 500.
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
 * Answers an error caught in a controller with the legacy envelope:
 * - AppError 401 → `res.unauthorized(code)`; 403 → `res.forbidden()` (always says FORBIDDEN);
 * - AppError 400 without `data` → `res.error(code, debugMessage)`;
 * - other AppError 4xx, or 400 with `data` → `res.error({ statusCode, message: code, data }, debugMessage)`;
 * - AppError 5xx and anything else → `res.internalServerError(error)` (500 SOME_ERROR_OCCURRED, details logged only).
 * @param {import('express').Response} res
 * @param {unknown} error
 */
const handleControllerError = (res, error) => {
  if (!(error instanceof AppError) || error.status >= 500) return res.internalServerError(error);

  const { code, status, data, debugMessage } = error;
  if (status === 401) return res.unauthorized(code);
  if (status === 403) return res.forbidden();
  if (status === 400 && data === undefined) return res.error(code, debugMessage);
  return res.error({ statusCode: status, message: code, data }, debugMessage);
};

module.exports = { AppError, handleControllerError };
