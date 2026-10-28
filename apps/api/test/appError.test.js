const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { AppError, handleControllerError } = require('../src/helpers/appError.helper');

// handleControllerError must pick the same res.* helper (and arguments) the legacy controllers call, so the
// envelopes stay byte for byte; the helpers themselves are exercised over HTTP in favorites.test.js.

const recorder = () => {
  const calls = [];
  const record =
    (name) =>
    (...args) => {
      calls.push([name, ...args]);
      return name;
    };
  return {
    calls,
    res: {
      error: record('error'),
      unauthorized: record('unauthorized'),
      forbidden: record('forbidden'),
      internalServerError: record('internalServerError'),
    },
  };
};

describe('AppError', () => {
  test('carries a message key and an HTTP status (400 by default)', () => {
    const error = new AppError('BOOK_NOT_EXIST');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'AppError');
    assert.equal(error.message, 'BOOK_NOT_EXIST');
    assert.deepEqual([error.code, error.status, error.data], ['BOOK_NOT_EXIST', 400, undefined]);
  });

  test('refuses a missing code or a non-error status', () => {
    assert.throws(() => new AppError(), TypeError);
    assert.throws(() => new AppError('X', { status: 200 }), RangeError);
    assert.throws(() => new AppError('X', { status: 404.5 }), RangeError);
  });
});

describe('handleControllerError', () => {
  const cases = [
    ['400 without data → res.error(code)', new AppError('BOOK_NOT_EXIST'), ['error', 'BOOK_NOT_EXIST', undefined]],
    [
      '400 with a debug message → res.error(code, debugMessage)',
      new AppError('INVALID_LOGIN_ATTEMPT', { debugMessage: 'INVALID_PASSWORD' }),
      ['error', 'INVALID_LOGIN_ATTEMPT', 'INVALID_PASSWORD'],
    ],
    [
      '400 with data → object form',
      new AppError('PINCODE_ERROR', { data: {} }),
      ['error', { statusCode: 400, message: 'PINCODE_ERROR', data: {} }, undefined],
    ],
    [
      'other 4xx → object form with that status',
      new AppError('ORDER_NOT_FOUND', { status: 404 }),
      ['error', { statusCode: 404, message: 'ORDER_NOT_FOUND', data: undefined }, undefined],
    ],
    ['401 → res.unauthorized(code)', new AppError('INVALID_TOKEN', { status: 401 }), ['unauthorized', 'INVALID_TOKEN']],
    ['403 → res.forbidden()', new AppError('FORBIDDEN', { status: 403 }), ['forbidden']],
  ];

  for (const [name, error, expected] of cases) {
    test(name, () => {
      const { calls, res } = recorder();
      handleControllerError(res, error);
      assert.deepEqual(calls, [expected]);
    });
  }

  test('5xx AppErrors and any other error → res.internalServerError(error)', () => {
    for (const error of [new AppError('SOME_ERROR_OCCURRED', { status: 503 }), new Error('boom'), 'thrown string']) {
      const { calls, res } = recorder();
      handleControllerError(res, error);
      assert.deepEqual(calls, [['internalServerError', error]]);
    }
  });
});
