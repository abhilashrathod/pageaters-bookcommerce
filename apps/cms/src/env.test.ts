import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseEnv } from './env.ts';

// Fake values only.
const VALID = { MONGODB_URI: 'mongodb://127.0.0.1:27017/pageaters_cms', PAYLOAD_SECRET: 's'.repeat(32) };

void test('accepts the CMS database and a long secret; the Blob token is optional', () => {
  assert.deepEqual(parseEnv(VALID), { ...VALID, DEMO_MODE: false, BLOB_READ_WRITE_TOKEN: undefined, VERCEL: undefined });
  assert.equal(parseEnv({ ...VALID, BLOB_READ_WRITE_TOKEN: ' ' }).BLOB_READ_WRITE_TOKEN, undefined);
});

void test('refuses the API database and a URI without a database', () => {
  assert.throws(
    () => parseEnv({ ...VALID, MONGODB_URI: 'mongodb+srv://u:p@cluster.example.net/pageaters_api?retryWrites=true' }),
    /must not be the API database/,
  );
  assert.throws(() => parseEnv({ ...VALID, MONGODB_URI: 'mongodb://127.0.0.1:27017' }), /must name its database/);
});

void test('names missing or weak variables without echoing values', () => {
  assert.throws(() => parseEnv({}), /MONGODB_URI: is required[\s\S]*PAYLOAD_SECRET: is required/);
  assert.throws(
    () => parseEnv({ ...VALID, PAYLOAD_SECRET: 'shortqq7' }),
    (error: Error) => /PAYLOAD_SECRET: must be at least 32 characters/.test(error.message) && !error.message.includes('qq7'),
  );
});

void test('requires the Blob token on Vercel', () => {
  assert.throws(() => parseEnv({ ...VALID, VERCEL: '1' }), /BLOB_READ_WRITE_TOKEN: is required on Vercel/);
  assert.equal(parseEnv({ ...VALID, VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'fake' }).VERCEL, '1');
});
