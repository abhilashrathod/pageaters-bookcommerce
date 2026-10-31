import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { isSafeHref } from '../fields/link.ts';
import { COLOR_TOKENS, RADIUS_DEFAULT, isHexColor, isRem } from './theme-tokens.ts';

void test('theme defaults match the shared theme.css', () => {
  const css = readFileSync(new URL('../../../../packages/config/tailwind/theme.css', import.meta.url), 'utf8');
  const root = css.slice(css.indexOf(':root'), css.indexOf('}'));
  for (const [token, value] of Object.entries(COLOR_TOKENS)) {
    assert.match(root, new RegExp(`--${token}: ${value};`), `--${token}`);
  }
  assert.match(root, new RegExp(`--radius: ${RADIUS_DEFAULT};`));
  const declared = [...root.matchAll(/--([a-z-]+):/g)].map((match) => match[1]);
  assert.deepEqual(
    declared.filter((name) => name !== 'radius' && name !== 'font-body'),
    Object.keys(COLOR_TOKENS),
  );
});

void test('links take a site path or an https URL only', () => {
  for (const ok of ['/', '/collections', '/books/abc?x=1', 'https://openlibrary.org/']) assert.equal(isSafeHref(ok), true, ok);
  for (const bad of [
    'javascript:alert(1)',
    'http://example.com',
    '//evil.example',
    '/\\evil.example',
    'https://a.b\\c',
    'collections',
    '',
    '/ space',
    'https://',
  ]) {
    assert.equal(isSafeHref(bad), false, bad);
  }
});

void test('theme values are hex colours and rem lengths', () => {
  assert.equal(isHexColor('#FF5f25'), true);
  for (const bad of ['red', '#fff', 'url(x)', '#ff5f25;']) assert.equal(isHexColor(bad), false, bad);
  for (const ok of ['0', '1rem', '0.75rem']) assert.equal(isRem(ok), true, ok);
  for (const bad of ['1px', 'calc(1rem)', '1rem;']) assert.equal(isRem(bad), false, bad);
});
