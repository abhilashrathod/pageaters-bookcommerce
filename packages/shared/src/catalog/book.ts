import { z } from 'zod';

import { bookAvailabilitySchema, bookVersionSchema, productTypeSchema, readingLevelSchema } from '../enums.ts';
import { apiResponse, imageUrlSchema, isoDateSchema, moneySchema, objectIdSchema, paginated } from '../primitives.ts';
import { authorFieldsSchema, authorRefSchema } from './author.ts';
import { bundleFieldsSchema, bundleRefSchema } from './bundle.ts';
import { categoryFieldsSchema, categoryRefSchema } from './category.ts';
import { collectionFieldsSchema, collectionRefSchema } from './collection.ts';
import { countSchema, discountSchema, ref } from './common.ts';

// A store book (API model `storeBook.model.js`, collection `storebooks`, served at /store-books). The collection
// also holds book boxes and other product types (`type`). Supplier prices (`wholeSalePriceHistory`) are never
// part of the contract; `inventory` is the demo stock count. Layers and references: see `common.ts`.
export const bookFieldsSchema = z.object({
  _id: objectIdSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  bookId: z.string(),
  type: productTypeSchema,

  title: z.string(),
  // Title shown for blind-date books (`type: 'blind_book'`); '' otherwise.
  blindTitle: z.string(),
  tagline: z.string(),
  eyebrow: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  // Added to the model after launch: older documents don't have it.
  message: z.string().optional(),

  language: z.string(),
  // Legacy documents store null for unknown page counts and weights.
  pages: countSchema.nullable(),
  readingLevel: readingLevelSchema,
  // No model default; every seeded book has one.
  version: bookVersionSchema.optional(),
  // Number of books in a box; plain books store -1.
  books: z.number().int(),

  // Free text in centimetres, e.g. '12.9 x 2.3 x 19.7'.
  dimensions: z.string(),
  // Grams.
  weight: z.number().nonnegative().nullable(),

  ISBN: z.string(),
  // Free text: mostly a year, sometimes a full date ('11 April 2017').
  publicationYear: z.string(),
  publisher: z.string(),

  editorsPick: z.boolean(),
  bestSeller: z.boolean(),
  newRelease: z.boolean(),
  // Added to the model after launch: older documents don't have it.
  preOrder: z.boolean().optional(),
  bookOfTheMonth: z.boolean(),
  availability: bookAvailabilitySchema,

  poster: imageUrlSchema,
  images: z.array(imageUrlSchema),

  totalReviews: countSchema,
  averageReviews: z.number().nonnegative(),

  inventory: countSchema,
  currentDiscount: discountSchema,
  popularity: z.number(),
  priority: z.number(),

  price: moneySchema,
  rentPrice: moneySchema,
  membersPrice: moneySchema,
  membersRentPrice: moneySchema,
});

// A book as another document references it. Populated, its own references are ids or projections.
export const bookRefSchema = z.union([
  objectIdSchema,
  bookFieldsSchema.partial().extend({
    _id: objectIdSchema,
    get author() {
      return ref(authorFieldsSchema).optional();
    },
    get bundledBooks() {
      return z.array(ref(bookFieldsSchema)).optional();
    },
    get categories() {
      return z.array(ref(categoryFieldsSchema)).optional();
    },
    get relatedBooks() {
      return z.array(ref(bookFieldsSchema)).optional();
    },
    get relatedBundles() {
      return z.array(ref(bundleFieldsSchema)).optional();
    },
    get relatedCollections() {
      return z.array(ref(collectionFieldsSchema)).optional();
    },
  }),
]);
export type BookRef = z.infer<typeof bookRefSchema>;

export const bookSchema = bookFieldsSchema.extend({
  // No model default, so optional by the contract's rule, though the seed guarantees every book has one.
  get author() {
    return authorRefSchema.optional();
  },
  bundledBooks: z.array(bookRefSchema),
  get categories() {
    return z.array(categoryRefSchema);
  },
  relatedBooks: z.array(bookRefSchema),
  get relatedBundles() {
    return z.array(bundleRefSchema);
  },
  get relatedCollections() {
    return z.array(collectionRefSchema);
  },
});
export type Book = z.infer<typeof bookSchema>;

// GET /store-books: its `select` projection, with `author` populated. `categories` is populated too, and
// Mongoose adds populated paths to the projection, but it is kept optional rather than relying on that.
export const bookListItemSchema = bookSchema
  .pick({
    _id: true,
    title: true,
    bookId: true,
    ISBN: true,
    author: true,
    inventory: true,
    poster: true,
    images: true,
    tags: true,
    price: true,
    weight: true,
    popularity: true,
    editorsPick: true,
    newRelease: true,
    preOrder: true,
    currentDiscount: true,
    bestSeller: true,
    categories: true,
  })
  .partial({ categories: true });
export type BookListItem = z.infer<typeof bookListItemSchema>;

export const bookListResponseSchema = apiResponse(paginated(bookListItemSchema));
// GET /store-books/unique/:bookId — the whole document; author, categories and related* populated.
export const bookDetailResponseSchema = apiResponse(bookSchema);
