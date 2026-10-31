import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CMS_BLOCK_TYPES } from './index.ts';
import type { CmsBlockOf } from './index.ts';

void test('lists each block type once', () => {
  assert.equal(new Set(CMS_BLOCK_TYPES).size, CMS_BLOCK_TYPES.length);
});

void test('narrows a block by type', () => {
  const banner: CmsBlockOf<'banner'> = { blockType: 'banner', layout: 'promo', heading: 'Pre-order now' };
  assert.equal(banner.blockType, 'banner');
});
