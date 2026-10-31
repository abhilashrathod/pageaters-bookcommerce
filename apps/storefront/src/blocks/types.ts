import type { CmsBlockOf, CmsBlockType } from '@pageaters/cms-types';
import type { Book, Bundle, Category, Collection } from '@pageaters/shared';
import type { ReactNode } from 'react';

// The commerce item a template page is for; the core blocks (productInfo, listingHeader, listingGrid) render it.
export type PageItem =
  | { kind: 'book'; data: Book }
  | { kind: 'bundle'; data: Bundle }
  | { kind: 'collection'; data: Collection }
  | { kind: 'category'; data: Category };

// What a block knows about its page: the item (template pages only) and the listing page number (`?page=`).
export type BlockContext = { item?: PageItem; page?: number };

// A block component is a Server Component that fetches its own data. It is called as a plain async function by
// renderBlock (to catch its failures), so it must not be a client component; render client leaves inside it.
export type BlockComponent<T extends CmsBlockType> = (props: {
  block: CmsBlockOf<T>;
  context: BlockContext;
}) => ReactNode | Promise<ReactNode>;

export type BlockRegistry = { [T in CmsBlockType]?: BlockComponent<T> };
