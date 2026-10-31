import assert from 'node:assert/strict';
import { test } from 'node:test';

import { safeGroups, safeLinks } from './links.ts';

void test('safeLinks keeps site paths and https URLs, drops the rest', () => {
  const links = safeLinks([
    { label: 'Books', href: '/collections' },
    { label: 'Open Library', href: 'https://openlibrary.org', newTab: true },
    { label: 'Script', href: 'javascript:alert(1)' },
    { label: 'Protocol-relative', href: '//evil.example' },
    { label: '', href: '/no-label' },
    null,
  ]);
  assert.deepEqual(links, [
    { label: 'Books', href: '/collections', newTab: false },
    { label: 'Open Library', href: 'https://openlibrary.org', newTab: true },
  ]);
  assert.deepEqual(safeLinks(undefined), []);
});

void test('safeGroups drops groups left without links', () => {
  const groups = safeGroups([
    { title: 'Shop', links: [{ label: 'Books', href: '/books' }] },
    { title: 'Empty', links: [{ label: 'Insecure', href: 'http://insecure.example' }] },
  ]);
  assert.deepEqual(groups, [{ title: 'Shop', links: [{ label: 'Books', href: '/books', newTab: false }] }]);
});
