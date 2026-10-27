// Fields copied from the dump into the seed, per collection, including the keys of nested objects. Anything
// not listed is dropped, so a field that was never reviewed cannot leak into the seed. Mirrors the Mongoose schemas in apps/api/src/models.
// Left out on purpose: `wholeSalePriceHistory` (supplier prices), `inventory` (real stock, regenerated),
// `__v` (Mongoose internal).

export interface CollectionSpec {
  // File name in the dump: `pageaters.<dumpName>.json`.
  dumpName: string;
  // File name written to `seed/data/<seedName>.json`.
  seedName: string;
  // Collections with soft delete keep only `isDeleted: false` documents.
  softDelete: boolean;
  fields: readonly string[];
  // Allowed keys of object fields (or of each entry of an array of objects).
  nested?: Record<string, readonly string[]>;
  // ObjectId reference fields → `dumpName` of the target collection. Pruned to targets that survive sanitising.
  refs: Record<string, string>;
}

const timestamps = ['_id', 'createdAt', 'updatedAt'] as const;
const softDelete = ['isDeleted', 'deletedAt'] as const;

export const authors: CollectionSpec = {
  dumpName: 'authors',
  seedName: 'authors',
  softDelete: true,
  fields: [...timestamps, ...softDelete, 'authorId', 'name', 'intro', 'avatar', 'priority', 'popularity', 'books'],
  refs: { books: 'storebooks' },
};

export const bundles: CollectionSpec = {
  dumpName: 'bundles',
  seedName: 'bundles',
  softDelete: true,
  fields: [
    ...timestamps,
    ...softDelete,
    'bundleId',
    'title',
    'description',
    'tags',
    'poster',
    'currentDiscount',
    'weight',
    'bundledBooks',
    'categories',
    'popularity',
    'priority',
    'price',
    'membersPrice',
    'relatedCollections',
    'relatedBundles',
  ],
  refs: { bundledBooks: 'storebooks', categories: 'categories', relatedCollections: 'collections', relatedBundles: 'bundles' },
};

export const categories: CollectionSpec = {
  dumpName: 'categories',
  seedName: 'categories',
  softDelete: true,
  fields: [
    ...timestamps,
    ...softDelete,
    'categoryId',
    'title',
    'description',
    'thumbnail',
    'priority',
    'popularity',
    'numberOfBooks',
    'meta',
  ],
  nested: { meta: ['title', 'description', 'imageUrl', 'url'] },
  refs: {},
};

export const collections: CollectionSpec = {
  dumpName: 'collections',
  seedName: 'collections',
  softDelete: true,
  fields: [
    ...timestamps,
    ...softDelete,
    'collectionId',
    'title',
    'description',
    'tags',
    'poster',
    'priority',
    'popularity',
    'books',
    'relatedCollections',
    'relatedCategories',
    'featuredAuthors',
  ],
  refs: { books: 'storebooks', relatedCollections: 'collections', relatedCategories: 'categories', featuredAuthors: 'authors' },
};

export const productSets: CollectionSpec = {
  dumpName: 'product_sets',
  seedName: 'product-sets',
  softDelete: false,
  fields: [...timestamps, 'setId', 'products', 'categories', 'slug', 'title', 'description', 'isActive', 'deactivatedAt'],
  nested: { products: ['_id', 'product', 'priority'] },
  // `products[].product` points at store books; pruned separately.
  refs: { categories: 'categories' },
};

export const storeBooks: CollectionSpec = {
  dumpName: 'storebooks',
  seedName: 'store-books',
  softDelete: true,
  fields: [
    ...timestamps,
    ...softDelete,
    'bookId',
    'title',
    'blindTitle',
    'tagline',
    'eyebrow',
    'author',
    'description',
    'tags',
    'language',
    'pages',
    'readingLevel',
    'version',
    'type',
    'books',
    'bundledBooks',
    'dimensions',
    'weight',
    'ISBN',
    'publicationYear',
    'publisher',
    'editorsPick',
    'bestSeller',
    'newRelease',
    'preOrder',
    'bookOfTheMonth',
    'availability',
    'message',
    'poster',
    'images',
    'totalReviews',
    'averageReviews',
    'currentDiscount',
    'popularity',
    'priority',
    'categories',
    'relatedBooks',
    'relatedBundles',
    'relatedCollections',
    'price',
    'rentPrice',
    'membersPrice',
    'membersRentPrice',
  ],
  refs: {
    bundledBooks: 'storebooks',
    categories: 'categories',
    relatedBooks: 'storebooks',
    relatedBundles: 'bundles',
    relatedCollections: 'collections',
  },
};

export const specs = [authors, bundles, categories, collections, productSets, storeBooks] as const;
