const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const fs = require('node:fs');
const path = require('node:path');

const { parseEnv, EnvError, VARIABLES } = require('../src/env');

// Fake values only. Each distinctive value is asserted to never appear in an error message.
const MINIMAL = Object.freeze({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/pageaters_test',
  ENCRYPTION_KEY: 'k'.repeat(32),
  RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123',
});

// What the real adapters need, with fake values.
const SENDGRID = Object.freeze({ EMAIL_ADAPTER: 'sendgrid', SENDGRID_API_KEY: 'SG.fake-key', MAIL_FROM: 'sender@example.com' });
const TWILIO = Object.freeze({
  SMS_ADAPTER: 'twilio',
  TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}`,
  TWILIO_AUTH_TOKEN: 'fake-twilio-token',
  TWILIO_PHONE: '+15005550006',
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
    assert.equal(env.EMAIL_ADAPTER, 'mock');
    assert.equal(env.SMS_ADAPTER, 'mock');
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
    // RAZORPAY_KEY_ID is required only with PAYMENTS_ADAPTER=razorpay (6b).
    const required = ['ENCRYPTION_KEY', 'MONGODB_URI'];
    for (const name of required) assert.match(error.message, new RegExp(`${name}: is required`));
    assert.deepEqual([...error.variables].sort(), required);
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
      EMAIL_ADAPTER: 'SECRETEMAILADAPTERqq7',
      SMS_ADAPTER: 'SECRETSMSADAPTERqq7',
      ALLOWED_ORIGINS: 'https://SECRETORIGINqq7.example/path',
      MAIL_FROM: 'SECRETMAILqq7',
      TWILIO_PHONE: 'SECRETPHONEqq7',
      DELHIVERY_BASE_URL: 'SECRETBASEURLqq7',
      SHIPPING_ADAPTER: 'SECRETSHIPPINGqq7',
      STORAGE_ADAPTER: 'SECRETSTORAGEqq7',
    };
    const error = failure(bad);
    assert.doesNotMatch(error.message, /SECRET|qq7/);
    // TWILIO_AUTH_TOKEN is valid here (any non-empty string), so it is the only variable not reported.
    assert.equal(error.variables.length, Object.keys(bad).length - 1);
  });
});

describe('parseEnv adapters', () => {
  test('defaults both adapters to mock and needs no vendor key for them', () => {
    const env = parseEnv({ ...MINIMAL, EMAIL_ADAPTER: ' ', SMS_ADAPTER: '' });
    assert.equal(env.EMAIL_ADAPTER, 'mock');
    assert.equal(env.SMS_ADAPTER, 'mock');
    assert.equal(env.SENDGRID_API_KEY, undefined);
    assert.equal(env.TWILIO_ACCOUNT_SID, undefined);
  });

  test('accepts the mock explicitly, with or without vendor keys set', () => {
    const env = parseEnv({ ...MINIMAL, ...SENDGRID, ...TWILIO, EMAIL_ADAPTER: 'mock', SMS_ADAPTER: 'mock' });
    assert.equal(env.EMAIL_ADAPTER, 'mock');
    assert.equal(env.SMS_ADAPTER, 'mock');
  });

  test('selects a real adapter when its keys are all set', () => {
    const env = parseEnv({ ...MINIMAL, ...SENDGRID, ...TWILIO });
    assert.equal(env.EMAIL_ADAPTER, 'sendgrid');
    assert.equal(env.SMS_ADAPTER, 'twilio');
    assert.equal(env.MAIL_FROM, 'sender@example.com');
  });

  test('requires the SendGrid key and sender only when EMAIL_ADAPTER=sendgrid', () => {
    const error = failure({ ...MINIMAL, EMAIL_ADAPTER: 'sendgrid' });
    assert.match(error.message, /SENDGRID_API_KEY: is required when EMAIL_ADAPTER=sendgrid/);
    // MAIL_FROM has a default for the mock; a real send must name its sender.
    assert.match(error.message, /MAIL_FROM: is required when EMAIL_ADAPTER=sendgrid/);
    assert.deepEqual([...error.variables].sort(), ['MAIL_FROM', 'SENDGRID_API_KEY']);
  });

  test('requires the Twilio keys only when SMS_ADAPTER=twilio, naming each missing one', () => {
    const error = failure({ ...MINIMAL, SMS_ADAPTER: 'twilio', TWILIO_AUTH_TOKEN: 'fake-twilio-token' });
    assert.deepEqual([...error.variables].sort(), ['TWILIO_ACCOUNT_SID', 'TWILIO_PHONE']);
    assert.match(error.message, /TWILIO_ACCOUNT_SID: is required when SMS_ADAPTER=twilio/);
    assert.match(error.message, /TWILIO_PHONE: is required when SMS_ADAPTER=twilio/);
  });

  test('still validates a vendor key that is set for the selected adapter', () => {
    const error = failure({ ...MINIMAL, ...TWILIO, TWILIO_ACCOUNT_SID: 'XXsecretqq7' });
    assert.deepEqual(error.variables, ['TWILIO_ACCOUNT_SID']);
    assert.match(error.message, /TWILIO_ACCOUNT_SID: must start with AC/);
    assert.doesNotMatch(error.message, /qq7/);
  });

  test('reports adapter keys together with other problems', () => {
    const error = failure({ ENCRYPTION_KEY: 'k'.repeat(32), RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123', EMAIL_ADAPTER: 'sendgrid' });
    assert.deepEqual([...error.variables].sort(), ['MAIL_FROM', 'MONGODB_URI', 'SENDGRID_API_KEY']);
  });

  test('refuses an unknown adapter name without echoing it and without asking for vendor keys', () => {
    for (const [name, value] of [
      ['EMAIL_ADAPTER', 'smtpqq7'],
      ['SMS_ADAPTER', 'constructor'],
    ]) {
      const error = failure({ ...MINIMAL, [name]: value });
      assert.deepEqual(error.variables, [name]);
      assert.match(error.message, new RegExp(`${name}: must be one of`));
      assert.equal(error.message.includes(value), false);
    }
  });

  test('never echoes a vendor key value', () => {
    const error = failure({ ...MINIMAL, EMAIL_ADAPTER: 'sendgrid', SENDGRID_API_KEY: 'SG.SECRETqq7', SMS_ADAPTER: 'twilio', TWILIO_AUTH_TOKEN: 'SECRETTOKENqq7' });
    assert.deepEqual([...error.variables].sort(), ['MAIL_FROM', 'TWILIO_ACCOUNT_SID', 'TWILIO_PHONE']);
    assert.doesNotMatch(error.message, /SECRET|qq7/);
  });
});

describe('parseEnv DEMO_MODE', () => {
  const DEMO = { DEMO_MODE: 'true', CRON_SECRET: 'fake-cron-secret-0123456789' };

  test('requires a CRON_SECRET of at least 16 characters, never echoed', () => {
    assert.deepEqual(failure({ ...MINIMAL, DEMO_MODE: 'true' }).variables, ['CRON_SECRET']);
    const error = failure({ ...MINIMAL, ...DEMO, CRON_SECRET: 'shortqq9' });
    assert.match(error.message, /CRON_SECRET: must be at least 16 characters/);
    assert.doesNotMatch(error.message, /qq9/);
  });

  test('is off by default and on only for true', () => {
    assert.equal(parseEnv(MINIMAL).DEMO_MODE, false);
    assert.equal(parseEnv({ ...MINIMAL, DEMO_MODE: 'false' }).DEMO_MODE, false);
    assert.equal(parseEnv({ ...MINIMAL, ...DEMO }).DEMO_MODE, true);
    assert.deepEqual(failure({ ...MINIMAL, DEMO_MODE: 'yes' }).variables, ['DEMO_MODE']);
  });

  test('refuses a real e-mail or SMS adapter and any SendGrid/Twilio key', () => {
    const error = failure({ ...MINIMAL, ...SENDGRID, ...TWILIO, ...DEMO });
    assert.deepEqual(
      [...error.variables].sort(),
      ['EMAIL_ADAPTER', 'SENDGRID_API_KEY', 'SMS_ADAPTER', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
    );
    assert.match(error.message, /EMAIL_ADAPTER: must be mock when DEMO_MODE=true/);
    assert.match(error.message, /TWILIO_AUTH_TOKEN: must be unset when DEMO_MODE=true/);
    assert.doesNotMatch(error.message, /fake-twilio-token|SG\.fake-key/);
  });

  test('refuses vendor keys left set with the mock adapters', () => {
    const error = failure({ ...MINIMAL, ...SENDGRID, ...TWILIO, EMAIL_ADAPTER: 'mock', SMS_ADAPTER: 'mock', ...DEMO });
    assert.deepEqual([...error.variables].sort(), ['SENDGRID_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN']);
  });
});

describe('parseEnv payments adapter', () => {
  const RAZORPAY = Object.freeze({
    PAYMENTS_ADAPTER: 'razorpay',
    RAZORPAY_KEY_ID: 'rzp_test_FAKEKEY123',
    RAZORPAY_KEY_SECRET: 'fake-razorpay-secret',
    RAZORPAY_WEBHOOK_SECRET: 'fake-webhook-secret',
  });
  const WITHOUT_KEY = Object.freeze({ MONGODB_URI: MINIMAL.MONGODB_URI, ENCRYPTION_KEY: MINIMAL.ENCRYPTION_KEY });

  test('defaults to the mock and needs no Razorpay key', () => {
    const env = parseEnv(WITHOUT_KEY);
    assert.equal(env.PAYMENTS_ADAPTER, 'mock');
    assert.equal(env.RAZORPAY_KEY_ID, undefined);
  });

  test('selects Razorpay when its keys are all set', () => {
    assert.equal(parseEnv({ ...WITHOUT_KEY, ...RAZORPAY }).PAYMENTS_ADAPTER, 'razorpay');
  });

  test('requires the key id, key secret and webhook secret only when PAYMENTS_ADAPTER=razorpay', () => {
    const error = failure({ ...WITHOUT_KEY, PAYMENTS_ADAPTER: 'razorpay' });
    assert.deepEqual([...error.variables].sort(), ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']);
    assert.match(error.message, /RAZORPAY_KEY_ID: is required when PAYMENTS_ADAPTER=razorpay/);
  });

  // Critical guard (AGENTS.md §6): a live key is refused whichever adapter is selected.
  test('refuses a live key with the mock adapter too, without echoing it', () => {
    for (const PAYMENTS_ADAPTER of [undefined, 'mock', 'razorpay']) {
      const error = failure({ ...RAZORPAY, ...WITHOUT_KEY, PAYMENTS_ADAPTER, RAZORPAY_KEY_ID: 'rzp_live_SECRETqq7' });
      assert.deepEqual(error.variables, ['RAZORPAY_KEY_ID']);
      assert.match(error.message, /RAZORPAY_KEY_ID: is a live key/);
      assert.doesNotMatch(error.message, /SECRET|qq7/);
    }
    const error = failure({ ...WITHOUT_KEY, PAYMENTS_ADAPTER: 'mock', RAZORPAY_KEY_ID: 'notarazorpaykey42' });
    assert.match(error.message, /RAZORPAY_KEY_ID: must start with rzp_test_/);
  });

  test('refuses an unknown adapter name without echoing it', () => {
    const error = failure({ ...MINIMAL, PAYMENTS_ADAPTER: 'stripeqq7' });
    assert.deepEqual(error.variables, ['PAYMENTS_ADAPTER']);
    assert.doesNotMatch(error.message, /qq7/);
  });

  // Without a secret no webhook verifies; a deployed API must not run that way unnoticed.
  test('requires the webhook secret in staging and production, with either adapter', () => {
    for (const APP_ENV of ['staging', 'production']) {
      for (const PAYMENTS_ADAPTER of [undefined, 'mock']) {
        const error = failure({ ...MINIMAL, APP_ENV, PAYMENTS_ADAPTER });
        assert.deepEqual(error.variables, ['RAZORPAY_WEBHOOK_SECRET']);
        assert.match(error.message, new RegExp(`RAZORPAY_WEBHOOK_SECRET: is required when APP_ENV=${APP_ENV}`));
      }
      const withRazorpay = failure({ ...WITHOUT_KEY, APP_ENV, PAYMENTS_ADAPTER: 'razorpay' });
      assert.deepEqual(
        [...withRazorpay.variables].sort(),
        ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
        'reported once',
      );
      assert.equal(parseEnv({ ...MINIMAL, APP_ENV, RAZORPAY_WEBHOOK_SECRET: 'fake-webhook-secret' }).APP_ENV, APP_ENV);
    }
  });

  test('the webhook secret stays optional in development and test, and is never echoed', () => {
    for (const APP_ENV of [undefined, 'development', 'test']) {
      assert.equal(parseEnv({ ...MINIMAL, APP_ENV }).RAZORPAY_WEBHOOK_SECRET, undefined);
    }
    const error = failure({ ...MINIMAL, APP_ENV: 'production', RAZORPAY_WEBHOOK_SECRET: ' ', RAZORPAY_KEY_ID: 'rzp_live_SECRETqq7' });
    assert.deepEqual([...error.variables].sort(), ['RAZORPAY_KEY_ID', 'RAZORPAY_WEBHOOK_SECRET']);
    assert.doesNotMatch(error.message, /SECRETqq7/);
    // An invalid APP_ENV is reported by the schema and never echoed in a "required when" message.
    const invalid = failure({ ...MINIMAL, APP_ENV: 'productionqq7' });
    assert.deepEqual(invalid.variables, ['APP_ENV']);
    assert.doesNotMatch(invalid.message, /qq7/);
  });
});

describe('parseEnv shipping and storage adapters', () => {
  test('default to the mocks and need no vendor key', () => {
    const env = parseEnv(MINIMAL);
    assert.deepEqual([env.SHIPPING_ADAPTER, env.STORAGE_ADAPTER], ['mock', 'mock']);
    assert.equal(env.DELHIVERY_BASE_URL, 'https://staging-express.delhivery.com');
  });

  test('require the Delhivery token only when SHIPPING_ADAPTER=delhivery', () => {
    const error = failure({ ...MINIMAL, SHIPPING_ADAPTER: 'delhivery' });
    assert.deepEqual(error.variables, ['DELHIVERY_API_TOKEN']);
    assert.match(error.message, /DELHIVERY_API_TOKEN: is required when SHIPPING_ADAPTER=delhivery/);
    assert.equal(parseEnv({ ...MINIMAL, SHIPPING_ADAPTER: 'delhivery', DELHIVERY_API_TOKEN: 'fake-token' }).SHIPPING_ADAPTER, 'delhivery');
  });

  test('require the Blob token only when STORAGE_ADAPTER=blob', () => {
    const error = failure({ ...MINIMAL, STORAGE_ADAPTER: 'blob' });
    assert.deepEqual(error.variables, ['BLOB_READ_WRITE_TOKEN']);
    assert.match(error.message, /BLOB_READ_WRITE_TOKEN: is required when STORAGE_ADAPTER=blob/);
    assert.equal(parseEnv({ ...MINIMAL, STORAGE_ADAPTER: 'blob', BLOB_READ_WRITE_TOKEN: 'fake-blob-token' }).STORAGE_ADAPTER, 'blob');
  });

  test('ignore the removed S3 and image CDN variables', () => {
    const env = parseEnv({ ...MINIMAL, S3_REGION: 'x', S3_ACCESS_KEY_ID: 'x', S3_SECRET_ACCESS_KEY: 'x', IMAGE_CDN_URL: 'not a url' });
    for (const name of ['S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'IMAGE_CDN_URL']) assert.equal(name in env, false, name);
  });
});

test('.env.example documents exactly the variables the API reads, plus the seed-only ones', () => {
  const documented = fs
    .readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
    .filter(Boolean);
  const seedOnly = ['SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD'];
  assert.deepEqual([...documented].sort(), [...VARIABLES, ...seedOnly].sort());
});
