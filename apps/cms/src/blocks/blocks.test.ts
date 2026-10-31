import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isObjectId } from '../fields/commerce.ts';
import { validateCoreBlocks } from './core.ts';

const layout = (...types: string[]) => types.map((blockType) => ({ blockType }));

void test('a detail template keeps its product info block exactly once', () => {
  assert.equal(validateCoreBlocks(layout('banner', 'productInfo', 'richText'), 'product'), true);
  assert.equal(validateCoreBlocks(layout('productInfo'), 'book-box'), true);
  assert.match(String(validateCoreBlocks(layout('banner'), 'product')), /productInfo block exactly once/);
  assert.match(String(validateCoreBlocks(layout('productInfo', 'productInfo'), 'bundle')), /exactly once/);
  assert.match(String(validateCoreBlocks(undefined, 'product')), /exactly once/);
});

void test('a listing template keeps its header and grid, and no detail block', () => {
  assert.equal(validateCoreBlocks(layout('listingGrid', 'banner', 'listingHeader'), 'collection'), true);
  assert.match(String(validateCoreBlocks(layout('listingHeader'), 'category')), /listingGrid/);
  assert.match(String(validateCoreBlocks(layout('listingHeader', 'listingGrid', 'productInfo'), 'category')), /doesn’t belong/);
});

void test('commerce ids are ObjectIds', () => {
  assert.equal(isObjectId('64d000000000000000000a01'), true);
  for (const bad of ['', '64D000000000000000000A01', '64d0', '{"$ne":1}']) assert.equal(isObjectId(bad), false, bad);
});
