import assert from 'node:assert/strict';
import { test } from 'node:test';

import { themeCss } from './theme.ts';

void test('writes each valid token as a CSS variable', () => {
  assert.equal(
    themeCss({ accent: '#ff5f25', primary_foreground: '#FFFFFF', radius: '0.5rem' }),
    ':root{--primary-foreground:#FFFFFF;--accent:#ff5f25;--radius:0.5rem}',
  );
});

void test('drops values that are not plain hex colours or rem lengths', () => {
  assert.equal(themeCss({ accent: 'red;}body{display:none', background: '#fff', radius: '1rem}' }), '');
});

void test('no theme (CMS unreachable) keeps the defaults', () => {
  assert.equal(themeCss(null), '');
});
