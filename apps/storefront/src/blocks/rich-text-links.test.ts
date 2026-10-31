import assert from 'node:assert/strict';
import { test } from 'node:test';

import { linkHref } from './rich-text-links.ts';

void test('custom links keep site paths and https URLs only', () => {
  assert.equal(linkHref({ linkType: 'custom', url: '/collections' }), '/collections');
  assert.equal(linkHref({ linkType: 'custom', url: 'https://openlibrary.org' }), 'https://openlibrary.org');
  for (const url of ['javascript:alert(1)', '//evil.com', '/\\evil.com', 'http://example.com', '', null]) {
    assert.equal(linkHref({ linkType: 'custom', url }), null, String(url));
  }
});

void test('internal links lead to the populated CMS page', () => {
  assert.equal(linkHref({ linkType: 'internal', doc: { relationTo: 'pages', value: { slug: 'shipping' } } }), '/shipping');
  assert.equal(linkHref({ linkType: 'internal', doc: { relationTo: 'pages', value: { slug: 'home' } } }), '/');
  assert.equal(linkHref({ linkType: 'internal', doc: { relationTo: 'pages', value: '65f1c0ffee0000000000abcd' } }), null);
  assert.equal(linkHref({ linkType: 'internal', doc: { relationTo: 'pages', value: { slug: '../x' } } }), null);
});
