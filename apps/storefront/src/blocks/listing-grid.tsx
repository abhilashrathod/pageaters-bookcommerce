import type { CmsBlockOf } from '@pageaters/cms-types';

import { BookGrid } from '@/components/book-grid.tsx';
import { catalogApi } from '@/lib/api.ts';

import type { BlockContext } from './types.ts';

// Core block: the collection's or category's books, `pageSize` per page, page from `?page=`.
export async function ListingGridBlock({ block, context }: { block: CmsBlockOf<'listingGrid'>; context: BlockContext }) {
  const { item, page = 1 } = context;
  const limit = Number(block.pageSize) || 24;
  if (item?.kind === 'collection') {
    const books = item.data.books.filter((book) => typeof book === 'object');
    return <BookGrid books={books.slice((page - 1) * limit, page * limit)} page={page} totalPages={Math.ceil(books.length / limit)} />;
  }
  if (item?.kind === 'category') {
    const result = await catalogApi.categories.products({ id: item.data._id, page, limit });
    return <BookGrid books={result.docs} page={page} totalPages={result.totalPages} />;
  }
  return null;
}
