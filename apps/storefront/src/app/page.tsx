import type { CmsBlock } from '@pageaters/cms-types';

import { RenderBlocks } from '@/blocks/render-blocks.tsx';
import { catalogApi } from '@/lib/api.ts';

// Placeholder until the CMS page routes land (Phase 7 "Routes"): a fixed layout with each free block, to check them
// against the legacy look. The last block is deliberately unknown (it must render nothing).
export default async function HomePage() {
  const firstSet = await catalogApi.productSets
    .list({ page: 1, limit: 1 })
    .then(({ docs }) => docs[0]?._id)
    .catch(() => undefined);
  const blocks = [
    {
      blockType: 'banner',
      layout: 'promo',
      heading: 'Books, boxes and bundles for every reader',
      text: 'A portfolio demo store: browse the catalog, fill a cart and try the checkout. Nothing is shipped or charged.',
      link: { label: 'Browse collections', href: '/collections' },
    },
    { blockType: 'featuredBooks', heading: 'Best sellers', list: 'bestSeller', limit: 12 },
    ...(firstSet ? [{ blockType: 'productSetRow', productSet: firstSet, limit: 12 }] : []),
    { blockType: 'carousel', heading: 'Collections', source: 'collections', limit: 12 },
    { blockType: 'carousel', heading: 'Categories', source: 'categories', limit: 12 },
    { blockType: 'carousel', heading: 'Bundles', source: 'bundles', limit: 8 },
    { blockType: 'carousel', heading: 'Deals', source: 'deals', limit: 6 },
    {
      blockType: 'richText',
      content: {
        root: {
          type: 'root',
          children: [
            { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'About this demo' }] },
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: 'Pageaters was a real Indian bookstore. ', format: 1 },
                { type: 'text', text: 'Read the ' },
                { type: 'link', fields: { linkType: 'custom', url: '/shipping' }, children: [{ type: 'text', text: 'shipping notes' }] },
                { type: 'text', text: ' or this unsafe link, shown as plain text: ' },
                { type: 'link', fields: { linkType: 'custom', url: 'javascript:alert(1)' }, children: [{ type: 'text', text: 'click me' }] },
              ],
            },
          ],
        },
      },
    },
    { blockType: 'spacer' },
  ] as unknown as CmsBlock[];
  return (
    <main className="py-4">
      <RenderBlocks blocks={blocks} />
    </main>
  );
}
