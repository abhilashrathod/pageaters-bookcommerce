const pino = require('pino');

const { env } = require('../env');

// The API's one logger (AGENTS.md §5): pino, one JSON line per entry on stdout, which Vercel captures. Writes go to
// process.stdout itself, not pino's asynchronous default destination: stdout to a file or a pipe is synchronous on
// Linux, so a line written just before a serverless function freezes or the process crashes is not lost, and tests
// can read the lines (test/helpers/logs.js). The level is LOG_LEVEL (src/env.js; silent under APP_ENV=test).
//
// Per request, middlewares/requestContext.middleware.js binds a child logger with the request ID as `req.log`.
//
// Redaction covers the logged object and the bindings, never the message: log data as fields with a fixed message,
// never through format-string arguments (`logger.info('%o', data)` writes `data` unredacted).

// Keys whose values are never logged, at any depth: passwords, one-time codes, tokens, secrets, API keys, cookies,
// Authorization headers, signatures and sessions (`newPassword`, `resetToken`, `set-cookie`…), and as a backstop the
// shopper's contact details (`email`, `contactNo`, `phone`, `address`…).
const SENSITIVE_KEY = new RegExp(
  [
    'pass(word)?',
    'otp',
    'token',
    'secret',
    'api[-_]?key',
    'authori[sz]ation',
    'cookie',
    'signature',
    'jwt',
    'session',
    'credential',
    'email',
    'phone',
    'mobile',
    'contact',
    'address',
  ].join('|'),
  'i',
);
const CENSOR = '[Redacted]';
// Deeper values are replaced whole: log objects are small, and an unexpectedly deep one is not walked further.
const MAX_DEPTH = 8;
// The message logged in place of an error's own when a call passes only the error (`logger.error(err)`): pino would
// otherwise use `err.message`.
const ERROR_MESSAGE = 'Error';

const isCode = (value) => typeof value === 'number' || (typeof value === 'string' && /^[A-Z0-9_.]{1,40}$/i.test(value));

// Programming errors, whose message comes from the code ("Cannot read properties of undefined (reading 'x')"), not
// from data. Any other message (driver, vendor, JSON.parse) can quote a document, an address or a phone number, and so
// can Node's own argument errors (`ERR_INVALID_ARG_TYPE`: "… Received type number (…)"), whatever their class.
const CODE_MESSAGE_ERRORS = new Set(['TypeError', 'ReferenceError']);

/**
 * What to log of a failure: its name, code, status and stack frames; the message only for a TypeError or
 * ReferenceError without a Node `ERR_*` code. Never the cause, the request or the vendor's response.
 * @param {unknown} error
 * @returns {{ type: string, message?: string, code?: string | number, status?: number, stack?: string }}
 */
const errorSummary = (error) => {
  if (!(error instanceof Error)) return { type: typeof error };
  const summary = { type: error.name };
  const nodeCode = typeof error.code === 'string' && error.code.startsWith('ERR_');
  if (CODE_MESSAGE_ERRORS.has(error.name) && !nodeCode) summary.message = error.message;
  if (isCode(error.code)) summary.code = error.code;
  if (Number.isInteger(error.status)) summary.status = error.status;
  // The first stack line repeats the message; keep the frames only.
  const frames = String(error.stack ?? '')
    .split('\n')
    .filter((line) => /^\s+at /.test(line));
  if (frames.length > 0) summary.stack = frames.join('\n');
  return summary;
};

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const SUMMARY_KEYS = new Set(['type', 'message', 'code', 'status', 'stack']);

/**
 * What an `err` field logs: an error's summary, a summary made earlier (only its own keys), and for anything else (a
 * vendor SDK's plain-object rejection, a string) its type only, never its contents.
 * @param {unknown} value
 * @returns {{ type: string }}
 */
const errField = (value) => {
  const isSummary = isPlainObject(value) && typeof value.type === 'string' && Object.keys(value).every((key) => SUMMARY_KEYS.has(key));
  return isSummary ? value : errorSummary(value);
};

/**
 * A non-plain object's own data (`toObject()` for a Mongoose document, else `toJSON()`), or the value itself; a
 * conversion that throws gives `[Redacted]`.
 * @param {unknown} value
 * @returns {unknown}
 */
const plainData = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || isPlainObject(value)) return value;
  try {
    if (typeof value.toObject === 'function') return value.toObject();
    if (typeof value.toJSON === 'function') return value.toJSON();
  } catch {
    return CENSOR;
  }
  return value;
};

/**
 * Copies a log object with every sensitive key's value replaced by `[Redacted]`. An error anywhere becomes its
 * errorSummary, and an `err` field is always one (errField); a value with `toObject()` or `toJSON()` (a Mongoose
 * document, an ObjectId, a date) is first turned into its plain data, so a document's fields are checked too. Other
 * values are kept as they are.
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
const redact = (value, depth = 0) => {
  if (value instanceof Error) return errorSummary(value);
  const data = plainData(value);
  if (!Array.isArray(data) && !isPlainObject(data)) return data;
  if (depth >= MAX_DEPTH) return CENSOR;
  if (Array.isArray(data)) return data.map((item) => redact(item, depth + 1));
  const copy = {};
  for (const [key, item] of Object.entries(data)) {
    if (SENSITIVE_KEY.test(key)) copy[key] = CENSOR;
    else copy[key] = key === 'err' ? errField(item) : redact(item, depth + 1);
  }
  return copy;
};

/**
 * Gives a call that passes only an error, or an object with `err`, a fixed message instead of pino's default (the
 * error's message).
 * @this {import('pino').Logger}
 * @param {unknown[]} args
 * @param {(...args: unknown[]) => void} method
 */
function withFixedErrorMessage(args, method) {
  const [first, second] = args;
  const carriesError = first instanceof Error || (first !== null && typeof first === 'object' && 'err' in first);
  if (carriesError && typeof second !== 'string') return method.call(this, first, ERROR_MESSAGE);
  return method.apply(this, args);
}

/**
 * Creates a logger with the API's settings (level, redaction of every entry and child binding, ISO time, no
 * pid/hostname). Log an error as `{ err: error }` with a fixed message; it is written as its errorSummary.
 * @param {{ level?: string, destination?: { write: (line: string) => unknown } }} [options]
 * @returns {import('pino').Logger}
 */
const createLogger = ({ level = env.LOG_LEVEL, destination = process.stdout } = {}) => {
  const created = pino(
    {
      level,
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
      // redact() has already made `err` a summary (errField); this replaces pino's default `err` serializer, which
      // would rewrite it.
      serializers: { err: errField },
      hooks: { logMethod: withFixedErrorMessage },
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => redact(object),
      },
    },
    destination,
  );
  // pino's `bindings` formatter applies to the root logger's base only, so child and later bindings are redacted here.
  // Children inherit these methods, so grandchildren are covered too.
  const { child, setBindings } = created;
  created.child = function redactedChild(bindings, options) {
    return child.call(this, redact(bindings), options);
  };
  created.setBindings = function redactedSetBindings(bindings) {
    return setBindings.call(this, redact(bindings));
  };
  return created;
};

const logger = createLogger();

let processHandlersInstalled = false;

/**
 * Logs what escapes every handler (idempotent). An unhandled rejection (a legacy write nobody awaits) is logged and
 * the process keeps serving; an uncaught exception is logged through the monitor hook, so Node's default still
 * follows (the process exits).
 */
const logProcessErrors = () => {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtExceptionMonitor', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
  });
};

module.exports = { logger, createLogger, errorSummary, logProcessErrors };
