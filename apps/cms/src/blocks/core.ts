import type { Block } from 'payload';

// Template core blocks: the commerce part of a page type, rendered from the item the page is for. A template must
// keep each of its type's core blocks exactly once (they can be moved, not removed) and may not hold another type's
// (`validateCoreBlocks`, enforced on save).

export const ProductInfo: Block = {
  slug: 'productInfo',
  interfaceName: 'ProductInfoBlock',
  labels: { singular: 'Product info + buy box (core)', plural: 'Product info + buy box (core)' },
  fields: [],
};

export const ListingHeader: Block = {
  slug: 'listingHeader',
  interfaceName: 'ListingHeaderBlock',
  labels: { singular: 'Listing header (core)', plural: 'Listing headers (core)' },
  fields: [{ name: 'showDescription', type: 'checkbox', defaultValue: true }],
};

export const ListingGrid: Block = {
  slug: 'listingGrid',
  interfaceName: 'ListingGridBlock',
  labels: { singular: 'Listing grid (core)', plural: 'Listing grids (core)' },
  // Public lists answer at most 50 items a page.
  fields: [{ name: 'pageSize', type: 'select', required: true, defaultValue: '24', options: ['12', '24', '48'] }],
};

export const CORE_BLOCKS = [ProductInfo, ListingHeader, ListingGrid];

const DETAIL = [ProductInfo.slug];
const LISTING = [ListingHeader.slug, ListingGrid.slug];

/** The core blocks each template type must hold. */
export const CORE_BY_TYPE: Record<string, string[]> = {
  product: DETAIL,
  bundle: DETAIL,
  'book-box': DETAIL,
  collection: LISTING,
  category: LISTING,
};

const CORE_SLUGS = new Set(CORE_BLOCKS.map((block) => block.slug));

/**
 * Checks a template's layout: each of its type's core blocks exactly once, no other type's.
 * @returns true, or the message for the editor.
 */
export const validateCoreBlocks = (layout: unknown, type: string | undefined): true | string => {
  const required = CORE_BY_TYPE[type ?? ''] ?? [];
  const used = (Array.isArray(layout) ? layout : []).map((block) => (block as { blockType?: string }).blockType ?? '');
  for (const slug of required) {
    const count = used.filter((blockType) => blockType === slug).length;
    if (count !== 1) return `This template must hold the ${slug} block exactly once (it can be moved, not removed)`;
  }
  const foreign = used.find((blockType) => CORE_SLUGS.has(blockType) && !required.includes(blockType));
  return foreign ? `The ${foreign} block doesn’t belong on a ${type ?? ''} template` : true;
};
