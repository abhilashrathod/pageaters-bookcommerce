const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { parseEnv, EnvError } = require('../src/env');

// Fake values only. Each distinctive value is asserted to never appear in an error message.
const MINIMAL = Object.freeze({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/pageaters_test',
  ENCRYPTION_KEY: 'k'.repeat(32),
  RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123',
  TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}`,
  TWILIO_AUTH_TOKEN: 'fake-twilio-token',
});

const failure = (source) => {
  try {
    parseEnv(source);
  } catch (error) {
    assert.ok(error instanceof EnvError, `expected EnvError, got ${error}`);
    return error;
  }
  assert.fail('parseEnv accepted an invalid source');
};

describe('parseEnv', () => {
  test('accepts a valid minimal source and applies defaults', () => {
    const env = parseEnv(MINIMAL);
    assert.equal(env.APP_ENV, 'development');
    assert.equal(env.PORT, 5005);
    assert.equal(env.STOREFRONT_URL, 'http://localhost:3000');
    assert.deepEqual(env.ALLOWED_ORIGINS, ['http://localhost:3000', 'http://localhost:4200']);
    assert.equal(env.DELHIVERY_BASE_URL, 'https://staging-express.delhivery.com');
    assert.equal(env.MAIL_FROM, 'no-reply@demo.pageaters.com');
    assert.equal(env.RAZORPAY_KEY_SECRET, undefined);
    assert.ok(Object.isFrozen(env));
    assert.ok(Object.isFrozen(env.ALLOWED_ORIGINS));
  });

  test('coerces types and ignores variables outside the schema', () => {
    const env = parseEnv({
      ...MINIMAL,
      PORT: '8080',
      ALLOWED_ORIGINS: ' https://demo.pageaters.com , http://localhost:4200 ',
      UNRELATED: 'x',
      // Removed with the in-process cron; a leftover value in an old .env is ignored.
      ENABLE_CRON: 'true',
    });
    assert.equal(env.PORT, 8080);
    assert.deepEqual(env.ALLOWED_ORIGINS, ['https://demo.pageaters.com', 'http://localhost:4200']);
    assert.equal('UNRELATED' in env, false);
    assert.equal('ENABLE_CRON' in env, false);
  });

  test('treats empty strings as unset', () => {
    const env = parseEnv({ ...MINIMAL, PORT: '', APP_ENV: ' ', TWILIO_PHONE: '' });
    assert.equal(env.PORT, 5005);
    assert.equal(env.APP_ENV, 'development');
    assert.equal(env.TWILIO_PHONE, undefined);

    const error = failure({ ...MINIMAL, MONGODB_URI: '' });
    assert.match(error.message, /MONGODB_URI: is required/);
  });

  test('rejects missing required variables, naming each one', () => {
    const error = failure({});
    for (const name of Object.keys(MINIMAL)) assert.match(error.message, new RegExp(`${name}: is required`));
    assert.deepEqual([...error.variables].sort(), Object.keys(MINIMAL).sort());
  });

  test('rejects an ENCRYPTION_KEY that is not 32 bytes', () => {
    const error = failure({ ...MINIMAL, ENCRYPTION_KEY: 'SHORTSECRETxyz' });
    assert.match(error.message, /ENCRYPTION_KEY: must be exactly 32 bytes/);
  });

  test('rejects a 32-character non-ASCII ENCRYPTION_KEY (more than 32 bytes in utf8)', () => {
    const key = 'é'.repeat(32);
    assert.equal(key.length, 32);
    const error = failure({ ...MINIMAL, ENCRYPTION_KEY: key });
    assert.match(error.message, /ENCRYPTION_KEY: must be exactly 32 bytes/);
    assert.equal(error.message.includes(key), false);
  });

  test('refuses a live Razorpay key', () => {
    const error = failure({ ...MINIMAL, RAZORPAY_KEY_ID: 'rzp_live_ZZFAKELIVE987' });
    assert.match(error.message, /RAZORPAY_KEY_ID: is a live key/);
  });

  test('requires the rzp_test_ prefix', () => {
    const error = failure({ ...MINIMAL, RAZORPAY_KEY_ID: 'notarazorpaykey42' });
    assert.match(error.message, /RAZORPAY_KEY_ID: must start with rzp_test_/);
  });

  test('rejects an origin with a path, a non-http scheme or a wildcard', () => {
    for (const ALLOWED_ORIGINS of [
      'https://evil.example/path',
      'ftp://files.example',
      'http://localhost:3000/',
      'http://*.example.com',
      '*',
    ]) {
      const error = failure({ ...MINIMAL, ALLOWED_ORIGINS });
      assert.match(error.message, /ALLOWED_ORIGINS: must be a comma-separated list of http\(s\) origins/);
    }
  });

  test('rejects a bad PORT', () => {
    for (const PORT of ['80a', '0', '70000', '-1']) {
      assert.match(failure({ ...MINIMAL, PORT }).message, /PORT: must be a whole number/);
    }
  });

  test('rejects other malformed values', () => {
    const error = failure({
      ...MINIMAL,
      APP_ENV: 'prod',
      MONGODB_URI: 'postgres://db',
      TWILIO_ACCOUNT_SID: 'XX123',
      TWILIO_PHONE: '98765 43210',
      MAIL_FROM: 'not-an-email',
      STOREFRONT_URL: 'javascript:alert(1)',
    });
    for (const name of ['APP_ENV', 'MONGODB_URI', 'TWILIO_ACCOUNT_SID', 'TWILIO_PHONE', 'MAIL_FROM', 'STOREFRONT_URL']) {
      assert.match(error.message, new RegExp(`\\b${name}: `));
    }
  });

  test('refuses a MONGODB_URI whose password has a raw @, without echoing it', () => {
    for (const MONGODB_URI of [
      'mongodb://dbuser:p@ss@127.0.0.1:27017/pageaters',
      'mongodb+srv://dbuser:a@b@c@cluster.example.net/pageaters?retryWrites=true',
    ]) {
      const error = failure({ ...MINIMAL, MONGODB_URI });
      assert.match(error.message, /MONGODB_URI: password must be URL-encoded/);
      assert.doesNotMatch(error.message, /p@ss|a@b|dbuser/);
    }
    for (const MONGODB_URI of [
      'mongodb://dbuser:p%40ss@127.0.0.1:27017/pageaters',
      'mongodb+srv://dbuser:pass@cluster.example.net/pageaters?appName=x@y',
      'mongodb://127.0.0.1:27017/pageaters',
    ]) {
      assert.equal(parseEnv({ ...MINIMAL, MONGODB_URI }).MONGODB_URI, MONGODB_URI);
    }
  });

  test('never echoes a value in the error message', () => {
    const bad = {
      MONGODB_URI: 'mysql://SECRETHOSTqq7/db',
      ENCRYPTION_KEY: 'SECRETKEYqq7',
      RAZORPAY_KEY_ID: 'rzp_live_SECRETqq7',
      TWILIO_ACCOUNT_SID: 'SECRETSIDqq7',
      TWILIO_AUTH_TOKEN: 'SECRETTOKENqq7',
      PORT: 'SECRETPORTqq7',
      APP_ENV: 'SECRETENVqq7',
      ALLOWED_ORIGINS: 'https://SECRETORIGINqq7.example/path',
      MAIL_FROM: 'SECRETMAILqq7',
      TWILIO_PHONE: 'SECRETPHONEqq7',
      IMAGE_CDN_URL: 'SECRETCDNqq7',
    };
    const error = failure(bad);
    assert.doesNotMatch(error.message, /SECRET|qq7/);
    // TWILIO_AUTH_TOKEN is valid here (any non-empty string), so it is the only variable not reported.
    assert.equal(error.variables.length, Object.keys(bad).length - 1);
  });
});
