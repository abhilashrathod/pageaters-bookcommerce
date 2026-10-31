import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import type { CmsBlock } from '@pageaters/cms-types';

import { renderBlock } from './safe-block.ts';
import type { BlockRegistry } from './types.ts';

const richText = { blockType: 'richText', id: 'b1', content: {} } as unknown as CmsBlock;
let warn: ReturnType<typeof mock.method>;

beforeEach(() => {
  warn = mock.method(console, 'warn', () => {});
});
afterEach(() => mock.restoreAll());

void test('renders the registered component with its block', async () => {
  const registry: BlockRegistry = { richText: ({ block }) => `rendered ${block.id}` };
  assert.equal(await renderBlock(richText, registry), 'rendered b1');
  assert.equal(warn.mock.callCount(), 0);
});

void test('passes the page context to the component', async () => {
  const registry: BlockRegistry = { richText: ({ context }) => `page ${context.page}` };
  assert.equal(await renderBlock(richText, registry, { page: 3 }), 'page 3');
});

void test('an unknown or malformed block renders nothing and warns', async () => {
  assert.equal(await renderBlock({ blockType: 'spacer' } as unknown as CmsBlock, {}), null);
  assert.equal(await renderBlock(null as unknown as CmsBlock, {}), null);
  assert.equal(warn.mock.callCount(), 2);
});

void test('a failing component renders nothing and warns', async () => {
  const registry: BlockRegistry = {
    richText: () => Promise.reject(new Error('API down')),
  };
  assert.equal(await renderBlock(richText, registry), null);
  assert.match(String(warn.mock.calls[0]?.arguments[0]), /richText block b1 failed: API down/);
});
