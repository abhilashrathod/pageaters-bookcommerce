import type { CmsBlock } from '@pageaters/cms-types';
import { prerender } from 'react-dom/static';
import { afterEach, expect, test, vi } from 'vitest';

import { RenderBlocks } from './render-blocks.tsx';
import type { BlockRegistry } from './types.ts';

const block = (blockType: string, id: string) => ({ blockType, id }) as unknown as CmsBlock;

const registry: BlockRegistry = {
  richText: ({ block }) => <p>{`rich ${block.id}`}</p>,
  faq: ({ block }) => Promise.resolve(<p>{`faq ${block.id}`}</p>),
};

// Waits for every Suspense boundary, like the streamed page does.
async function html(blocks: CmsBlock[]) {
  const { prelude } = await prerender(<RenderBlocks blocks={blocks} registry={registry} />);
  return new Response(prelude).text();
}

afterEach(() => vi.restoreAllMocks());

test('renders each known block in order', async () => {
  const out = await html([block('richText', 'a'), block('faq', 'b')]);
  expect(out).toContain('rich a');
  expect(out).toContain('faq b');
  expect(out.indexOf('rich a')).toBeLessThan(out.indexOf('faq b'));
});

test('skips an unknown block and keeps the rest of the page', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const out = await html([block('spacer', 'x'), block('richText', 'a')]);
  expect(out).toContain('rich a');
  expect(out).not.toContain('spacer');
  expect(warn).toHaveBeenCalledOnce();
});

test('renders nothing for an empty layout', async () => {
  expect(await html([])).toBe('');
});
