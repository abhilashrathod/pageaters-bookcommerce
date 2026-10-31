import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { notifyStorefront, previewPath, previewUrl, revalidationTags } from './storefront.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

void test('preview paths and the draft-mode URL', () => {
  assert.equal(previewPath('pages', { slug: 'home' }), '/');
  assert.equal(previewPath('pages', { slug: 'summer-sale' }), '/summer-sale');
  assert.equal(previewPath('templates', { type: 'book-box' }), '/preview/templates/book-box');
  assert.equal(previewPath('overrides', { type: 'collection', itemId: 'a'.repeat(24) }), `/preview/overrides/collection/${'a'.repeat(24)}`);
  assert.equal(
    previewUrl('http://localhost:3000/', 's&x', '/summer-sale'),
    'http://localhost:3000/api/draft?secret=s%26x&path=%2Fsummer-sale',
  );
});

void test('cache tags per document', () => {
  assert.deepEqual(revalidationTags('pages', { slug: 'home' }), ['cms:pages', 'cms:page:home']);
  assert.deepEqual(revalidationTags('templates', { type: 'product' }), ['cms:template:product']);
  assert.deepEqual(revalidationTags('overrides', { type: 'category', itemId: 'b'.repeat(24) }), [
    `cms:override:category:${'b'.repeat(24)}`,
  ]);
  assert.deepEqual(revalidationTags('header', {}), ['cms:global:header']);
});

void test('notifies the storefront once per tag set, and only logs a failure', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: url instanceof Request ? url.url : url.toString(), init: init ?? {} });
    return Promise.resolve(new Response(null, { status: 200 }));
  };
  const logged: object[] = [];
  const logger = { error: (object: object) => logged.push(object) };
  await notifyStorefront({ url: 'http://store.test/', secret: 'k' }, ['cms:pages', 'cms:pages', 'cms:page:home'], logger);
  assert.equal(calls[0]?.url, 'http://store.test/api/revalidate');
  assert.equal((calls[0]?.init.headers as Record<string, string>)['x-revalidate-secret'], 'k');
  assert.deepEqual(JSON.parse(calls[0]?.init.body as string), { tags: ['cms:pages', 'cms:page:home'] });

  globalThis.fetch = () => Promise.reject(new TypeError('fetch failed'));
  await notifyStorefront({ url: 'http://store.test', secret: 'k' }, ['cms:pages'], logger);
  assert.equal(logged.length, 1);
});
