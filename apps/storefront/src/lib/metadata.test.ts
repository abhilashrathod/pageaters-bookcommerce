import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMetadata, pageTitle, shortText } from './metadata.ts';

const seo = { siteName: 'Pageaters', titleTemplate: '%s · Pageaters demo', description: 'A demo bookstore.' };

void test('titles go through the SEO template; no title is the site name', () => {
  assert.equal(pageTitle(seo, 'Tweet Cute'), 'Tweet Cute · Pageaters demo');
  assert.equal(pageTitle(seo), 'Pageaters');
  assert.equal(pageTitle(null, 'Shipping'), 'Shipping | Pageaters');
});

void test('descriptions are flattened and capped at 160 characters', () => {
  assert.equal(shortText('  a\n\n b '), 'a b');
  assert.equal(shortText('x'.repeat(200))?.length, 158);
  assert.equal(shortText(''), undefined);
});

void test('metadata falls back to the SEO description and is never indexed', () => {
  const meta = buildMetadata(seo, { title: 'Shipping', path: '/shipping' });
  assert.deepEqual(meta.title, { absolute: 'Shipping · Pageaters demo' });
  assert.equal(meta.description, 'A demo bookstore.');
  assert.deepEqual(meta.robots, { index: false, follow: false });
});
