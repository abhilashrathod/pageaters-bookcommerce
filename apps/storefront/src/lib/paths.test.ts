import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cmsQuery } from './cms-query.ts';
import { parsePage, slugFromSegments } from './paths.ts';

void test('catch-all segments map to a slug; home only lives at /', () => {
  assert.equal(slugFromSegments(['shipping']), 'shipping');
  assert.equal(slugFromSegments(['home']), null);
  assert.equal(slugFromSegments([]), null);
});

void test('page numbers are positive whole numbers, else 1', () => {
  assert.equal(parsePage('3'), 3);
  assert.equal(parsePage(['2', '5']), 2);
  for (const bad of [undefined, '', '0', '-1', '1.5', 'abc']) assert.equal(parsePage(bad), 1);
});

void test('CMS queries ask for one published document and encode values', () => {
  const query = new URLSearchParams(cmsQuery('overrides', { type: 'book-box', itemId: 'a&b' }).split('?')[1]);
  assert.equal(query.get('where[type][equals]'), 'book-box');
  assert.equal(query.get('where[itemId][equals]'), 'a&b');
  assert.equal(query.get('where[_status][equals]'), 'published');
  assert.equal(query.get('limit'), '1');
});
