const s = require('@pageaters/shared');

// Public catalog reads and search. Detail routes take the public id (`bookId`, `authorId`…), not the ObjectId.

const v1 = (path) => `/api/v1${path}`;
const publicId = (kind) => ({ id: `The public \`${kind}\` (not the ObjectId).` });
const byCategory = { category: { schema: s.objectIdSchema, description: 'Only items in this category (ObjectId).' } };
const searchText = { q: { description: 'The search text; an empty one answers `[]`.' } };
const searchPath = { q: 'The search text (word-prefix match).' };

const catalog = (method, path, summary, rest) => ({ method, path: v1(path), tag: 'Catalog', summary, auth: 'public', ...rest });
const search = (path, summary, rest) => ({ method: 'GET', path: v1(path), tag: 'Search', summary, auth: 'public', ...rest });

module.exports = [
  catalog('GET', '/store-books', 'List books', {
    paged: 'public',
    filters: { type: { schema: s.productTypeSchema, description: 'Only this product type.' } },
    response: s.bookListResponseSchema,
  }),
  catalog('GET', '/store-books/unique/:id', 'Get a book', {
    description: 'The whole book; author, categories and related items populated.',
    params: publicId('bookId'),
    response: s.bookDetailResponseSchema,
  }),

  catalog('GET', '/authors', 'List authors', { paged: 'public', response: s.authorListResponseSchema }),
  catalog('GET', '/authors/unique/:id', 'Get an author', { params: publicId('authorId'), response: s.authorDetailResponseSchema }),

  catalog('GET', '/categories', 'List categories', { paged: 'public', response: s.categoryListResponseSchema }),
  catalog('GET', '/categories/unique/:id', 'Get a category', { params: publicId('categoryId'), response: s.categoryDetailResponseSchema }),
  catalog('GET', '/categories/:id/products', 'List a category’s books', {
    params: { id: 'The category’s ObjectId.' },
    paged: 'public',
    response: s.categoryProductsResponseSchema,
  }),
  catalog('GET', '/categories/:id/overview', 'Category overview', {
    description: 'Trending, newest and most discounted in-stock books; `page` and `limit` apply to each list.',
    params: { id: 'The category’s ObjectId.' },
    paged: 'public',
    response: s.shopperCategoryOverviewResponseSchema,
  }),

  catalog('GET', '/collections', 'List collections', { paged: 'public', filters: byCategory, response: s.collectionListResponseSchema }),
  catalog('GET', '/collections/unique/:id', 'Get a collection', {
    params: publicId('collectionId'),
    response: s.collectionDetailResponseSchema,
  }),

  catalog('GET', '/bundles', 'List bundles', { paged: 'public', filters: byCategory, response: s.bundleListResponseSchema }),
  catalog('GET', '/bundles/unique/:id', 'Get a bundle', { params: publicId('bundleId'), response: s.bundleDetailResponseSchema }),

  catalog('GET', '/deals', 'List deals', { request: s.dealListFilterSchema, paged: 'public', response: s.dealListResponseSchema }),
  catalog('GET', '/deals/unique/:id', 'Get a deal', { params: publicId('dealId'), response: s.dealDetailResponseSchema }),

  catalog('GET', '/product-sets/unique/:id', 'Get a product set', {
    params: publicId('setId'),
    response: s.productSetDetailResponseSchema,
  }),
  catalog('GET', '/product-sets/slug/:slug', 'Get a product set by slug', { response: s.productSetDetailResponseSchema }),

  catalog('GET', '/mystery-boxes', 'List mystery boxes', { paged: 'public', response: s.mysteryBoxListResponseSchema }),
  catalog('GET', '/mystery-boxes/unique/:id', 'Get a mystery box', {
    params: publicId('boxId'),
    response: s.mysteryBoxDetailResponseSchema,
  }),

  catalog('GET', '/add-ons/produtct/:productId', 'Add-ons for a book', {
    description: 'Every live add-on, grouped by category. The path keeps the legacy spelling (`produtct`).',
    request: s.addOnGroupsParamsSchema,
    response: s.addOnGroupsResponseSchema,
  }),

  search('/store-books/search', 'Search books', { filters: searchText, response: s.shopperBookSearchResponseSchema }),
  search('/authors/search', 'Search authors', { filters: searchText, response: s.shopperAuthorSearchResponseSchema }),
  search('/categories/search/:q', 'Search categories', { params: searchPath, response: s.shopperCategorySearchResponseSchema }),
  search('/collections/search/:q', 'Search collections', { params: searchPath, response: s.shopperCollectionSearchResponseSchema }),
  search('/bundles/search/:q', 'Search bundles', { params: searchPath, response: s.shopperBundleSearchResponseSchema }),
];
