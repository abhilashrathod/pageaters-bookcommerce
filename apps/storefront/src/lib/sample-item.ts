import type { PageItem } from '@/blocks/types.ts';
import { catalogApi } from '@/lib/api.ts';
import type { PageType } from '@/lib/content.ts';

// The item a template preview shows: the catalog's first of that type (undefined if the API has none or is down).
export async function sampleItem(type: PageType): Promise<PageItem | undefined> {
  const list = { page: 1, limit: 1 };
  try {
    if (type === 'product' || type === 'book-box') {
      const [first] = (await catalogApi.books.list({ ...list, type: type === 'product' ? 'book' : 'book_box' })).docs;
      return first && { kind: 'book', data: await catalogApi.books.detail({ id: first.bookId }) };
    }
    if (type === 'bundle') {
      const [first] = (await catalogApi.bundles.list(list)).docs;
      return first && { kind: 'bundle', data: await catalogApi.bundles.detail({ id: first.bundleId }) };
    }
    if (type === 'collection') {
      const [first] = (await catalogApi.collections.list(list)).docs;
      return first && { kind: 'collection', data: await catalogApi.collections.detail({ id: first.collectionId }) };
    }
    const [first] = (await catalogApi.categories.list(list)).docs;
    return first && { kind: 'category', data: await catalogApi.categories.detail({ id: first.categoryId }) };
  } catch {
    return undefined;
  }
}
