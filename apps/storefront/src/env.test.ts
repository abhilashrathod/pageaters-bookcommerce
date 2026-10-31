import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseEnv } from './env.ts';

void test('defaults to the local CMS and storefront', () => {
  assert.deepEqual(parseEnv({ CMS_URL: ' ' }), {
    API_URL: 'http://localhost:5005/api/v1',
    CMS_URL: 'http://localhost:3001',
    SITE_URL: 'http://localhost:3000',
  });
});

void test('names the bad variable, never its value', () => {
  assert.throws(() => parseEnv({ CMS_URL: 'ftp://secret-host', SITE_URL: 'https://demo.example.com/' }), (error: Error) => {
    assert.match(error.message, /CMS_URL: must be an http\(s\) URL/);
    assert.match(error.message, /SITE_URL: must not end with \//);
    assert.doesNotMatch(error.message, /secret-host/);
    return true;
  });
});
