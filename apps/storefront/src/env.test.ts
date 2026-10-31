import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseEnv } from './env.ts';

void test('defaults to the local CMS and storefront', () => {
  assert.deepEqual(parseEnv({ CMS_URL: ' ' }), {
    API_URL: 'http://localhost:5005/api/v1',
    NEXT_PUBLIC_API_URL: 'http://localhost:5005/api/v1',
    CMS_URL: 'http://localhost:3001',
    SITE_URL: 'http://localhost:3000',
    PREVIEW_SECRET: undefined,
    REVALIDATE_SECRET: undefined,
  });
});

void test('preview and revalidation secrets need 32 characters', () => {
  assert.equal(parseEnv({ PREVIEW_SECRET: 'x'.repeat(32) }).PREVIEW_SECRET, 'x'.repeat(32));
  assert.throws(() => parseEnv({ REVALIDATE_SECRET: 'short' }), /REVALIDATE_SECRET: must be at least 32 characters/);
});

void test('names the bad variable, never its value', () => {
  assert.throws(
    () => parseEnv({ CMS_URL: 'ftp://secret-host', SITE_URL: 'https://demo.example.com/' }),
    (error: Error) => {
      assert.match(error.message, /CMS_URL: must be an http\(s\) URL/);
      assert.match(error.message, /SITE_URL: must not end with \//);
      assert.doesNotMatch(error.message, /secret-host/);
      return true;
    },
  );
});
