// Types of the CMS's content (`apps/cms`), for the storefront and anyone else reading the CMS's REST API.
// `payload-types.ts` is generated from the Payload config: run `pnpm --filter cms generate:types` after changing a
// collection, global or block, and commit the result.
import type { Config, Page, Template } from './payload-types.ts';

export type * from './payload-types.ts';

/** A block as stored in a page's, template's or override's `layout`. */
export type CmsBlock = NonNullable<Page['layout'] | Template['layout']>[number];
export type CmsBlockType = CmsBlock['blockType'];
/** The block of one type, e.g. `CmsBlockOf<'banner'>`. */
export type CmsBlockOf<T extends CmsBlockType> = Extract<CmsBlock, { blockType: T }>;

export type CmsGlobals = Config['globals'];
export type CmsGlobalSlug = keyof CmsGlobals;

/**
 * Every block type, for the storefront's block registry (AGENTS.md: each block has a storefront component). The
 * compile-time check below fails when a block is added to or removed from the CMS without updating this list.
 */
export const CMS_BLOCK_TYPES = [
  'banner',
  'productSetRow',
  'featuredBooks',
  'carousel',
  'richText',
  'productInfo',
  'listingHeader',
  'listingGrid',
] as const satisfies readonly CmsBlockType[];

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _allBlockTypesListed: Same<CmsBlockType, (typeof CMS_BLOCK_TYPES)[number]> = true;
void _allBlockTypesListed;

/**
 * The one rule for every storefront href in CMS content: a site path (`/…`, never `//host` or a backslash) or an
 * https URL. The CMS validates links with it; the storefront checks again before rendering (defence in depth).
 */
export const isSafeHref = (value: string | null | undefined): boolean =>
  /^\/(?![/\\])[^\s\\]*$/.test(value ?? '') || /^https:\/\/[^\s/\\]+\.[^\s\\]+$/.test(value ?? '');
