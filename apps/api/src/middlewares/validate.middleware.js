/**
 * Request validation with the zod schemas from `@pageaters/shared` (`src/requests/*`).
 *
 * `validate(schema)` checks `req.allParams()` (route params, query and body merged) and, on failure, answers the
 * legacy 400 envelope through `res.error`: the first issue's message is the error code (the schemas carry the Joi
 * codes, e.g. INVALID_EMAIL), passed as an Error exactly as Joi's `.error(new Error(CODE))` handed it over, so the
 * body (`statusCode, status, message, error, data`), its key order and the request log stay as they were. An issue
 * without a code (unknown keys, enum values…) answers INVALID_REQUEST instead of Joi's/zod's English text.
 *
 * Query keys the schema doesn't list are left out before checking (a cache-buster such as `?_=123` must not turn a
 * request into a 400); unknown body keys are still refused by the strict schemas.
 *
 * On success the parsed value is `req.validated` (trimmed, lower-cased email, defaults applied; passwords stay as
 * sent). `req.body` and `req.query` are untouched. Controllers read `req.validated` where a rule depends on the
 * parsed value (see src/services/README.md).
 *
 * @param {import('zod').ZodType} schema
 * @returns {import('express').RequestHandler}
 */
const messages = require('../locales/en.json');

/**
 * The code answered for a failed check: the issue's message when it is a message key (the schemas' codes), else
 * INVALID_REQUEST — unknown keys and checks without a code would otherwise echo zod's text, which can carry a
 * client-chosen key name or the schema's enum values.
 * @param {{ message: string }} issue
 * @returns {string}
 */
const codeOf = (issue) => (Object.hasOwn(messages, issue.message) ? issue.message : 'INVALID_REQUEST');

module.exports = (schema) => {
  const known = schema.shape ? new Set(Object.keys(schema.shape)) : undefined;

  return (req, res, next) => {
    const input = { ...req.allParams() };

    if (known) {
      for (const key of Object.keys(req.query || {})) {
        const fromBody = req.body && typeof req.body === 'object' && Object.hasOwn(req.body, key);
        if (!known.has(key) && !fromBody) delete input[key];
      }
    }

    const result = schema.safeParse(input);

    if (!result.success) {
      return res.error(new Error(codeOf(result.error.issues[0])));
    }

    req.validated = result.data;
    return next();
  };
};
