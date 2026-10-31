import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isSafePath, parseTags, secretMatches } from './secrets.ts';

const SECRET = 'a'.repeat(32);

void test('secrets match only when set and equal', () => {
  assert.equal(secretMatches(SECRET, SECRET), true);
  assert.equal(secretMatches(SECRET, `${SECRET}b`), false);
  assert.equal(secretMatches(SECRET, null), false);
  assert.equal(secretMatches(undefined, ''), false);
  assert.equal(secretMatches('', ''), false);
});

void test('preview paths stay on this site', () => {
  for (const ok of ['/', '/shipping', '/preview/templates/product', '/a?b=1']) assert.equal(isSafePath(ok), true, ok);
  for (const bad of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'shipping', '/a b'])
    assert.equal(isSafePath(bad), false, String(bad));
});

void test('revalidation takes 1–50 cms tags', () => {
  assert.deepEqual(parseTags({ tags: ['cms:pages', 'cms:override:book-box:65f0c0ffee'] }), [
    'cms:pages',
    'cms:override:book-box:65f0c0ffee',
  ]);
  for (const bad of [null, {}, { tags: [] }, { tags: ['api:catalog'] }, { tags: [1] }, { tags: Array(51).fill('cms:pages') }])
    assert.equal(parseTags(bad), null);
});
