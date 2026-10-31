import type { CmsBlock, Override, Page, Template } from '@pageaters/cms-types';

import { cmsFetch } from '@/lib/cms.ts';
import { cmsQuery } from '@/lib/cms-query.ts';

export type PageType = Template['type'];
const PAGE_TYPES: readonly string[] = ['product', 'collection', 'category', 'bundle', 'book-box'] satisfies PageType[];
export const isPageType = (value: string): value is PageType => PAGE_TYPES.includes(value);
type Found<T> = { docs: T[] };

// Each read carries the tags the CMS revalidates on publish (apps/cms/src/storefront.ts). `undefined` = the CMS
// could not be reached; `null` = no such published document.
const first = async <T>(path: `/${string}`, tags: string[]): Promise<T | null | undefined> => {
  const found = await cmsFetch<Found<T>>(path, tags);
  return found ? (found.docs[0] ?? null) : undefined;
};

export const getPage = (slug: string) => first<Page>(cmsQuery('pages', { slug }), ['cms:pages', `cms:page:${slug}`]);

export const getTemplate = (type: PageType) => first<Template>(cmsQuery('templates', { type }), [`cms:template:${type}`]);

export const getOverride = (type: PageType, itemId: string) =>
  first<Override>(cmsQuery('overrides', { type, itemId }), [`cms:override:${type}:${itemId}`]);

// A template's core blocks alone, for when the CMS has no template (or is down): the item page still works.
export const DEFAULT_LAYOUT: Record<PageType, CmsBlock[]> = {
  product: [{ blockType: 'productInfo' }],
  bundle: [{ blockType: 'productInfo' }],
  'book-box': [{ blockType: 'productInfo' }],
  collection: [
    { blockType: 'listingHeader', showDescription: true },
    { blockType: 'listingGrid', pageSize: '24' },
  ],
  category: [
    { blockType: 'listingHeader', showDescription: true },
    { blockType: 'listingGrid', pageSize: '24' },
  ],
};

/** The blocks of an item page: its template's (or the default core blocks), then its override's. */
export const itemLayout = (type: PageType, template: Template | null | undefined, override: Override | null | undefined): CmsBlock[] => [
  ...(template?.layout ?? DEFAULT_LAYOUT[type]),
  ...(override?.layout ?? []),
];
