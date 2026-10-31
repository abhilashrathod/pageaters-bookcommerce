import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CORE_BY_TYPE, validateCoreBlocks } from '../blocks/core.ts';
import { isSafeHref } from '@pageaters/cms-types';
import { PAGE_TYPES } from '../collections/page-types.ts';
import { globals, homePage, pages, templates } from './content-data.ts';

void test('one valid template per page type', () => {
  assert.deepEqual(templates.map((template) => template.type).sort(), PAGE_TYPES.map((type) => type.value).sort());
  for (const template of templates) assert.equal(validateCoreBlocks(template.layout, template.type), true, template.type);
  assert.equal(Object.keys(CORE_BY_TYPE).length, templates.length);
});

void test('the homepage holds free blocks only, one row per product set', () => {
  const types = (homePage(['a'.repeat(24), 'b'.repeat(24)]).layout ?? []).map((block) => block.blockType);
  assert.equal(types.filter((type) => type === 'productSetRow').length, 2);
  assert.equal(validateCoreBlocks(homePage([]).layout, 'none'), true);
});

void test('every seeded link is a safe href', () => {
  const hrefs = JSON.stringify({ globals, home: homePage([]), pages }).match(/"href":"[^"]*"/g) ?? [];
  assert.ok(hrefs.length > 10);
  for (const href of hrefs) assert.equal(isSafeHref((JSON.parse(`{${href}}`) as { href: string }).href), true, href);
});

void test('every internal link leads to a seeded page or a storefront route', () => {
  const routes = new Set(['/', '/book-boxes', ...pages.map((page) => `/${page.slug}`)]);
  const hrefs = JSON.stringify({ globals, home: homePage([]), pages }).match(/"href":"\/[^"]*"/g) ?? [];
  for (const href of hrefs) {
    const path = (JSON.parse(`{${href}}`) as { href: string }).href;
    assert.ok(routes.has(path), `${path} has no page`);
  }
});

void test('seeded slugs are unique and valid', () => {
  const slugs = ['home', ...pages.map((page) => page.slug)];
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});
