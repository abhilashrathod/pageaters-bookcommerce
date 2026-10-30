const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureLogs, createUser, envelopes, startTestApp } = require('./helpers');
const { AppError, ProductMismatchError } = require('../src/helpers/appError.helper');
const { createLogger, errorSummary } = require('../src/helpers/logger.helper');
const { errorHandler } = require('../src/middlewares/errorHandler.middleware');
const messages = require('../src/locales/en.json');

// Phase 4 step 9: request IDs, the access log, redaction, the central error handler and GET /health, over HTTP
// against the real app. Errors that reach next() are raised by test-only routes appended to the /api/v1 router
// (after every real route, so they change nothing else).

const { badRequest } = envelopes;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SECRET_EMAIL = 'secret-reader@example.com';

let api;
let root;

const serverError = {
  statusCode: 500,
  status: 'SOME_ERROR_OCCURRED',
  message: messages.SOME_ERROR_OCCURRED,
  error: messages.SOME_ERROR_OCCURRED,
  data: {},
};

const objectError = (statusCode, status) => ({ statusCode, status, message: messages[status], error: messages[status], data: {} });

const send = async (path, init = {}) => {
  const res = await fetch(`${api.baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON: keep the text
  }
  return { status: res.status, body, headers: res.headers };
};

const accessLines = (logs) => logs.filter((entry) => entry.msg === 'request');

before(async () => {
  api = await startTestApp();
  root = api.baseUrl.replace(/\/api\/v1$/, '');
  const router = require('../src/routes');
  router.get('/test-only/app-error', () => {
    throw new AppError('USER_NOT_FOUND', { status: 404 });
  });
  router.get('/test-only/mismatch', () => {
    throw new ProductMismatchError('Please place separate order for this.');
  });
  router.get('/test-only/vendor-401', async () => {
    throw Object.assign(new Error('Vendor refused the credentials'), { status: 401, code: 20003 });
  });
  router.get('/test-only/crash', async () => {
    throw new Error(`Vendor refused ${SECRET_EMAIL}`);
  });
});

beforeEach(async () => {
  await api.reset();
});

after(async () => {
  await api.stop();
});

describe('request IDs', () => {
  test('generates a UUID when the request has none, and sends it as X-Request-Id', async () => {
    const first = await send('/');
    const second = await send('/');
    assert.match(first.headers.get('x-request-id'), UUID);
    assert.notEqual(first.headers.get('x-request-id'), second.headers.get('x-request-id'));
  });

  test('echoes a safe incoming X-Request-Id', async () => {
    for (const id of ['abcd1234', 'req_2026-10-30.trace-01', 'a'.repeat(128)]) {
      const res = await send('/', { headers: { 'x-request-id': id } });
      assert.equal(res.headers.get('x-request-id'), id);
    }
  });

  test('replaces an unsafe or malformed one with a fresh UUID', async () => {
    for (const id of ['short', 'a'.repeat(129), 'abc def ghi', '<script>alert(1)</script>', 'abcd1234é', 'id;rm -rf /x']) {
      const res = await send('/', { headers: { 'x-request-id': id } });
      assert.match(res.headers.get('x-request-id'), UUID, id);
    }
  });

  test('every error response carries it too', async () => {
    const res = await send('/does-not-exist', { headers: { 'x-request-id': 'trace-404-check' } });
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('x-request-id'), 'trace-404-check');
  });
});

describe('access log', () => {
  test('one line per request: method, route, status, duration and request ID; never the query, body or cookie', async (t) => {
    const logs = captureLogs(t);
    const { user, cookie, password } = await createUser();
    const res = await send(`/auth/login?email=${encodeURIComponent(SECRET_EMAIL)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'x-request-id': 'trace-login-01' },
      body: JSON.stringify({ email: user.email, password }),
    });
    assert.equal(res.status, 200);

    const lines = accessLines(logs);
    assert.equal(lines.length, 1);
    const [line] = lines;
    assert.deepEqual(Object.keys(line).sort(), ['durationMs', 'level', 'method', 'msg', 'reqId', 'route', 'status', 'time']);
    assert.deepEqual(
      [line.level, line.method, line.route, line.status, line.reqId],
      ['info', 'POST', '/api/v1/auth/login', 200, 'trace-login-01'],
    );
    assert.equal(typeof line.durationMs, 'number');

    const output = JSON.stringify(logs);
    const leaks = [
      SECRET_EMAIL,
      encodeURIComponent(SECRET_EMAIL),
      user.email,
      password,
      cookie.split('=')[1],
      res.headers.get('set-cookie'),
    ];
    for (const leak of leaks) {
      assert.ok(!output.includes(leak), `log contains ${leak}`);
    }
  });

  test('logs the route pattern of nested routers, never the search term or pincode in the path', async (t) => {
    const logs = captureLogs(t);
    assert.equal((await api.request('/bundles/search/zanzibar-qq7')).status, 200);
    assert.equal((await api.request('/addresses/check-pincode/999001')).status, 200);
    assert.deepEqual(
      accessLines(logs).map((line) => line.route),
      ['/api/v1/bundles/search/:q', '/api/v1/addresses/check-pincode/:pincode'],
    );
    assert.doesNotMatch(JSON.stringify(logs), /zanzibar|999001/);
  });

  test('a request no route handled logs route null and nothing from its URL', async (t) => {
    const logs = captureLogs(t);
    assert.equal((await send('/no-such-thing/zanzibar-qq8?q=1')).status, 404);
    const malformed = await send('/subscribers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.deepEqual(
      accessLines(logs).map((line) => [line.route, line.status]),
      [
        [null, 404],
        [null, 400],
      ],
    );
    assert.doesNotMatch(JSON.stringify(logs), /zanzibar|no-such-thing|subscribers/);
  });

  test('a refused login logs nothing about the user or the password', async (t) => {
    const logs = captureLogs(t);
    const { user } = await createUser();
    const res = await api.request('/auth/login', { method: 'POST', body: { email: user.email, password: 'wrong-password-qq7' } });
    assert.equal(res.status, 400);
    const output = JSON.stringify(logs);
    assert.doesNotMatch(output, /wrong-password-qq7/);
    assert.ok(!output.includes(user.email));
    // The reason is a fixed code, at debug level only.
    assert.deepEqual(
      logs.filter((entry) => entry.msg === 'request refused').map(({ level, debugMessage }) => [level, debugMessage]),
      [['debug', 'INVALID_PASSWORD']],
    );
  });

  test('the request log collection is gone: nothing is written to log_api', async () => {
    const { user } = await createUser();
    await api.request('/auth/login', { method: 'POST', body: { email: user.email, password: 'wrong-password-qq7' } });
    await send('/test-only/crash');
    assert.equal(mongoose.modelNames().includes('log_api'), false);
    assert.deepEqual(await mongoose.connection.db.listCollections({ name: 'log_api' }).toArray(), []);
  });
});

describe('redaction', () => {
  const capture = () => {
    const lines = [];
    const logger = createLogger({ level: 'info', destination: { write: (line) => lines.push(JSON.parse(line)) } });
    return { lines, logger };
  };

  test('password, OTP, token, secret, cookie and authorization values are replaced at any depth', () => {
    const { lines, logger } = capture();
    logger.info(
      {
        password: 'pw-qq7',
        body: { newPassword: 'pw-qq8', otp: '123456', nested: [{ resetToken: 'tok-qq9', ok: 'kept' }] },
        req: { headers: { cookie: '_PID=cookie-qq1', authorization: 'Bearer auth-qq2', accept: 'application/json' } },
        res: { headers: { 'set-cookie': ['_PID=cookie-qq3'] } },
        config: { RAZORPAY_KEY_SECRET: 'secret-qq4', apiKey: 'key-qq5' },
      },
      'redaction check',
    );
    const [line] = lines;
    assert.doesNotMatch(JSON.stringify(line), /qq\d|123456/);
    assert.equal(line.password, '[Redacted]');
    assert.equal(line.body.nested[0].resetToken, '[Redacted]');
    assert.equal(line.body.nested[0].ok, 'kept');
    assert.equal(line.req.headers.accept, 'application/json');
    assert.equal(line.req.headers.cookie, '[Redacted]');
  });

  test('a Mongoose document is logged as plain data, with its contact details and secrets redacted', async () => {
    const { lines, logger } = capture();
    const { user } = await createUser();
    logger.info({ user }, 'document check');
    const [line] = lines;
    assert.equal(line.user._id, String(user._id));
    assert.equal(line.user.email, '[Redacted]');
    assert.equal(line.user.contactNo, '[Redacted]');
    assert.ok(!JSON.stringify(line).includes(user.email));
    assert.ok(!JSON.stringify(line).includes(user.contactNo));
  });

  test('an error under any key is logged as its summary, never its request, response or headers', () => {
    const { lines, logger } = capture();
    const vendor = Object.assign(new Error('Request failed with status code 400'), {
      code: 'ERR_BAD_REQUEST',
      config: { headers: { Authorization: 'Bearer vendor-qq1' } },
      response: { status: 400, data: { to: '+919000000000', message: 'invalid number' } },
    });
    logger.warn({ error: vendor, attempts: [{ failure: vendor }] }, 'vendor check');
    const [line] = lines;
    assert.deepEqual(Object.keys(line.error).sort(), ['code', 'stack', 'type']);
    assert.equal(line.attempts[0].failure.type, 'Error');
    assert.doesNotMatch(JSON.stringify(line), /qq1|9000000000|invalid number/);
  });

  test('child logger bindings are redacted too, and so are bindings set later; the request ID is kept', () => {
    const { lines, logger } = capture();
    const child = logger.child({ reqId: 'trace-child-01', email: 'reader@example.com', session: 'sess-qq2' });
    child.info('child check');
    child.setBindings({ phone: '+919000000000', stage: 'checkout' });
    child.info('rebound check');
    assert.deepEqual([lines[0].reqId, lines[0].email, lines[0].session], ['trace-child-01', '[Redacted]', '[Redacted]']);
    assert.deepEqual([lines[1].phone, lines[1].stage], ['[Redacted]', 'checkout']);
    assert.doesNotMatch(JSON.stringify(lines), /reader@|qq2|9000000000/);
  });

  test('an err field never carries data: a plain-object rejection or a toJSON instance logs its type only', () => {
    const { lines, logger } = capture();
    // A vendor SDK's rejection shape (not an Error), as logProcessErrors would log it.
    const rejection = { statusCode: 400, error: { description: 'The To number +919000000000 is invalid' } };
    class VendorFailure {
      toJSON() {
        return { to: '+919000000000' };
      }
    }
    logger.error({ err: rejection }, 'Unhandled promise rejection');
    logger.error({ err: new VendorFailure() }, 'Unhandled promise rejection');
    logger.error({ err: { type: 'Error', code: 21211, to: '+919000000000' } }, 'not a summary: an extra key');
    assert.deepEqual(
      lines.map((line) => line.err),
      [{ type: 'object' }, { type: 'object' }, { type: 'object' }],
    );
    assert.doesNotMatch(JSON.stringify(lines), /9000000000|description/);
  });

  test('a toJSON or toObject that throws is logged as [Redacted], and the log call does not throw', () => {
    const { lines, logger } = capture();
    class Broken {
      toJSON() {
        throw new Error('cannot serialise reader@example.com');
      }
    }
    assert.doesNotThrow(() => logger.info({ thing: new Broken(), ok: 1 }, 'broken check'));
    assert.deepEqual([lines[0].thing, lines[0].ok], ['[Redacted]', 1]);
  });

  test('an error logged without a message gets a fixed one, not the error message', () => {
    const { lines, logger } = capture();
    const error = new Error('failed for reader@example.com');
    logger.error(error);
    logger.error({ err: error });
    logger.error({ err: error }, 'explicit message');
    assert.deepEqual(
      lines.map((line) => line.msg),
      ['Error', 'Error', 'explicit message'],
    );
    assert.doesNotMatch(JSON.stringify(lines), /reader@example\.com/);
  });

  test('errorSummary keeps the name, code, status and frames, never a data-bearing message', () => {
    const vendor = Object.assign(new Error(`The 'To' number +919000000000 is not valid`), { code: 21211, status: 400 });
    const summary = errorSummary(vendor);
    assert.deepEqual([summary.type, summary.code, summary.status, summary.message], ['Error', 21211, 400, undefined]);
    assert.match(summary.stack, /^\s+at /);
    assert.doesNotMatch(JSON.stringify(summary), /9000000000/);
    // A programming error's message comes from the code, so it is kept.
    const typeError = new TypeError("Cannot read properties of undefined (reading 'weight')");
    assert.equal(errorSummary(typeError).message, typeError.message);
    assert.deepEqual(errorSummary('thrown string'), { type: 'string' });
  });

  test('errorSummary drops a Node ERR_* message, which quotes the received value', () => {
    let thrown;
    try {
      Buffer.from(1234567890);
    } catch (error) {
      thrown = error;
    }
    const summary = errorSummary(thrown);
    assert.deepEqual([summary.type, summary.code, summary.message], ['TypeError', 'ERR_INVALID_ARG_TYPE', undefined]);
    assert.doesNotMatch(JSON.stringify(summary), /1234567890/);
  });
});

describe('central error handler', () => {
  test('an AppError passed to next() answers its status and legacy envelope', async () => {
    const res = await send('/test-only/app-error');
    assertBody(res, 404, objectError(404, 'USER_NOT_FOUND'));
  });

  test('a ProductMismatchError keeps the legacy PRODUCT_ITEM_MISMATCH body', async () => {
    const text = 'Please place separate order for this.';
    const body = { statusCode: 400, status: 'PRODUCT_ITEM_MISMATCH', error: text, message: text, data: {} };
    assertBody(await send('/test-only/mismatch'), 400, body);
  });

  test('a non-AppError with a 4xx status (a vendor error) answers 500 and is logged, not its 4xx', async (t) => {
    const logs = captureLogs(t);
    assertBody(await send('/test-only/vendor-401'), 500, serverError);
    const failures = logs.filter((entry) => entry.level === 'error');
    assert.deepEqual(
      failures.map(({ msg, err }) => [msg, err.type, err.code, err.status]),
      [['request failed', 'Error', 20003, 401]],
    );
    assert.doesNotMatch(JSON.stringify(logs), /Vendor refused/);
  });

  test('a path parameter with malformed percent-encoding answers 400 INVALID_REQUEST and logs nothing above info', async (t) => {
    const logs = captureLogs(t);
    for (const path of ['/bundles/search/%E0%A4%A', '/store-books/unique/%ZZ']) {
      assertBody(await send(path), 400, badRequest('INVALID_REQUEST'));
    }
    assert.deepEqual(
      logs.filter((entry) => !['trace', 'debug', 'info'].includes(entry.level)),
      [],
    );
  });

  test('an error raised before the response helpers exist answers the 500 envelope directly', () => {
    const lines = [];
    const log = createLogger({ level: 'info', destination: { write: (line) => lines.push(JSON.parse(line)) } });
    const sent = [];
    const res = {
      headersSent: false,
      status: (code) => {
        sent.push(code);
        return res;
      },
      json: (body) => sent.push(body),
    };
    errorHandler(new Error('early failure'), { log }, res, () => assert.fail('next() called'));
    assert.equal(JSON.stringify(sent), JSON.stringify([500, serverError]));
    assert.deepEqual(
      lines.map(({ level, msg, err }) => [level, msg, err.type]),
      [['error', 'request failed', 'Error']],
    );
  });

  test('any other error answers 500 SOME_ERROR_OCCURRED and is logged with the request ID, without its message', async (t) => {
    const logs = captureLogs(t);
    const res = await send('/test-only/crash', { headers: { 'x-request-id': 'trace-crash-01' } });
    assertBody(res, 500, serverError);
    assert.doesNotMatch(JSON.stringify(res.body), /at |Vendor|secret-reader/);

    const failures = logs.filter((entry) => entry.level === 'error');
    assert.equal(failures.length, 1);
    assert.deepEqual([failures[0].msg, failures[0].reqId, failures[0].err.type], ['request failed', 'trace-crash-01', 'Error']);
    assert.match(failures[0].err.stack, /logging\.test\.js/);
    assert.doesNotMatch(JSON.stringify(logs), /secret-reader|Vendor refused/);
  });

  test('malformed JSON answers 400 INVALID_JSON in the envelope, not an HTML page', async () => {
    const res = await send('/subscribers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"email": "reader@' });
    assertBody(res, 400, badRequest('INVALID_JSON'));
    assert.match(res.headers.get('content-type'), /application\/json/);
  });

  test('a body over 100 kb answers 413 REQUEST_TOO_LARGE in the envelope', async () => {
    const res = await send('/subscribers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.com', padding: 'x'.repeat(101 * 1024) }),
    });
    assertBody(res, 413, objectError(413, 'REQUEST_TOO_LARGE'));
  });

  test('an unsupported body charset answers its 4xx in the envelope', async () => {
    const res = await send('/subscribers', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=klingon' },
      body: '{}',
    });
    assertBody(res, 415, objectError(415, 'INVALID_REQUEST'));
  });

  test('unmatched routes answer 404 NOT_FOUND in the envelope, inside and outside /api/v1', async () => {
    assertBody(await send('/does-not-exist'), 404, objectError(404, 'NOT_FOUND'));
    const outside = await fetch(`${root}/nothing/here?x=1`);
    assert.equal(outside.status, 404);
    assert.equal(JSON.stringify(await outside.json()), JSON.stringify(objectError(404, 'NOT_FOUND')));
  });
});

describe('GET /health', () => {
  const health = () => fetch(`${root}/health`, { signal: AbortSignal.timeout(10_000) });

  test('answers 200 { status: ok } while MongoDB is connected, without auth', async () => {
    const res = await health();
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  test('answers 503 { status: unavailable } when the connection is not ready (the driver reconnecting)', async (t) => {
    Object.defineProperty(mongoose.connection, 'readyState', { get: () => 0, configurable: true });
    t.after(() => delete mongoose.connection.readyState);
    const res = await health();
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'unavailable' });
  });

  test('answers 503 when the ping fails, without saying why', async (t) => {
    t.mock.method(mongoose.connection.db, 'command', async () => {
      throw new Error('not primary: db.internal.example:27017');
    });
    const res = await health();
    assert.equal(res.status, 503);
    assert.equal(await res.text(), JSON.stringify({ status: 'unavailable' }));
  });

  test('answers 503 when the ping hangs past its timeout', async (t) => {
    t.mock.method(mongoose.connection.db, 'command', () => new Promise(() => {}));
    const started = Date.now();
    const res = await health();
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'unavailable' });
    assert.ok(Date.now() - started < 2500, 'answered after the 1 s ping timeout');
  });
});
