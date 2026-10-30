import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { z } from 'zod';

import * as admin from './index.ts';
import {
  adminAddOnListQuerySchema,
  adminAuthorBooksPayloadSchema,
  adminAuthorUpdatePayloadSchema,
  adminBookCreatePayloadSchema,
  adminBookReferencesPayloadSchema,
  adminBookUpdatePayloadSchema,
  adminBundleReferencesPayloadSchema,
  adminBundleUpdatePayloadSchema,
  adminCategoryCreatePayloadSchema,
  adminCollectionReferencesPayloadSchema,
  adminFileUploadFieldsSchema,
  adminOrderCancelPayloadSchema,
  adminOptionalIdListSchema,
  adminOrderListQuerySchema,
  adminProductSetReferencesPayloadSchema,
  adminProductSetListFilterSchema,
  adminProductSetListQuerySchema,
  adminSearchQuerySchema,
  adminStoreCreditIssuePayloadSchema,
} from './index.ts';

const id = (n: number) => `64d0000000000000000000${n.toString().padStart(2, '0')}`;

const bookCreate = {
  type: 'book',
  title: 'The Placeholder Atlas',
  author: id(1),
  categories: [id(2)],
  relatedBooks: [],
  poster: 'https://images.example.test/atlas.jpg',
  price: 499,
  inventory: 12,
} as const;

const bookUpdate = {
  type: 'book',
  title: 'The Placeholder Atlas',
  tagline: '',
  eyebrow: '',
  description: 'A fictional book.',
  message: '',
  tags: ['maps'],
  language: 'English',
  pages: 320,
  readingLevel: 'Beginner',
  version: 'paperback',
  dimensions: '12.9 x 2.3 x 19.7',
  weight: 300,
  ISBN: '0000000000000',
  publicationYear: '2020',
  publisher: 'Example House',
  editorsPick: false,
  bestSeller: false,
  newRelease: true,
  preOrder: false,
  availability: 'available',
  poster: 'https://images.example.test/atlas.jpg',
  images: [],
  inventory: 12,
  currentDiscount: 10,
  popularity: 0,
  price: 499,
  rentPrice: 0,
  membersPrice: 449,
  membersRentPrice: 0,
  categories: [id(2)],
  relatedBooks: [],
  relatedBundles: [],
  relatedCollections: [],
};

// Compile time: supplier prices are not a key of any admin book payload, as input or output.
type Has<T, Key extends PropertyKey> = Key extends keyof T ? true : false;
const _createInput: Has<z.input<typeof adminBookCreatePayloadSchema>, 'wholeSalePriceHistory'> = false;
const _createOutput: Has<z.output<typeof adminBookCreatePayloadSchema>, 'wholeSalePriceHistory'> = false;
const _updateInput: Has<z.input<typeof adminBookUpdatePayloadSchema>, 'wholeSalePriceHistory'> = false;
const _updateOutput: Has<z.output<typeof adminBookUpdatePayloadSchema>, 'wholeSalePriceHistory'> = false;
const _noSoftDelete: Has<z.input<typeof adminBookUpdatePayloadSchema>, 'isDeleted' | 'deletedAt'> = false;
void [_createInput, _createOutput, _updateInput, _updateOutput, _noSoftDelete];

void describe('admin book payloads', () => {
  void it('accept a fictional create and a full update', () => {
    assert.ok(adminBookCreatePayloadSchema.safeParse(bookCreate).success);
    assert.ok(adminBookUpdatePayloadSchema.safeParse(bookUpdate).success);
  });

  void it('strip wholeSalePriceHistory and server-owned fields at runtime', () => {
    const extra = { wholeSalePriceHistory: [1, 2], isDeleted: true, deletedAt: 'x', bookId: 'BK-0000000000' };
    for (const parsed of [
      adminBookCreatePayloadSchema.parse({ ...bookCreate, ...extra }),
      adminBookUpdatePayloadSchema.parse({ ...bookUpdate, ...extra }),
    ]) {
      for (const key of Object.keys(extra)) assert.equal(key in parsed, false, key);
    }
  });

  void it('accept a left-out reference list, but require every scalar field on update', () => {
    const { categories: _c, relatedBooks: _r, ...noLists } = bookCreate;
    assert.ok(adminBookCreatePayloadSchema.safeParse(noLists).success);
    const { categories: _uc, ...noCategories } = bookUpdate;
    assert.ok(adminBookUpdatePayloadSchema.safeParse(noCategories).success);
    const { price: _p, ...noPrice } = bookUpdate;
    assert.equal(adminBookUpdatePayloadSchema.safeParse(noPrice).success, false);
    assert.equal(adminBookUpdatePayloadSchema.safeParse({ ...bookUpdate, categories: ['nope'] }).success, false);
  });

  void it('reject a non-https poster', () => {
    assert.equal(adminBookCreatePayloadSchema.safeParse({ ...bookCreate, poster: 'atlas.jpg' }).success, false);
  });
});

void describe('admin update payloads', () => {
  // The updates `$set` every field they read, so each scalar field is required; a reference list may be left out
  // (the update keeps it).
  const updates = Object.entries(admin).filter(([name]) => name.endsWith('UpdatePayloadSchema'));

  void it('are all found', () => {
    assert.equal(updates.length, 9);
  });

  for (const [name, schema] of updates) {
    void it(`${name} has no optional key but its reference lists`, () => {
      const { shape } = schema as { shape: Record<string, z.ZodType> };
      for (const [key, field] of Object.entries(shape)) {
        if (field !== adminOptionalIdListSchema) assert.equal(field.safeParse(undefined).success, false, key);
      }
    });
  }
});

void describe('other admin payloads', () => {
  void it('type the catalog writes from the field schemas', () => {
    assert.ok(adminCategoryCreatePayloadSchema.safeParse({ title: 'Poetry', thumbnail: 'https://images.example.test/p.jpg' }).success);
    // Creates need their image (an https URL; the legacy upload's bare key fails).
    assert.equal(adminCategoryCreatePayloadSchema.safeParse({ title: 'Poetry' }).success, false);
    assert.equal(adminCategoryCreatePayloadSchema.safeParse({ title: 'Poetry', thumbnail: 'poetry-abc-1.jpg' }).success, false);
    assert.ok(
      adminAuthorUpdatePayloadSchema.safeParse({ name: 'A. Writer', intro: '', avatar: 'https://images.example.test/a.jpg', books: [] })
        .success,
    );
    // Bundles can't change weight on update, so it is not part of that payload.
    assert.equal('weight' in adminBundleUpdatePayloadSchema.shape, false);
  });

  void it('require a positive store credit', () => {
    assert.ok(adminStoreCreditIssuePayloadSchema.safeParse({ userId: id(3), credit: 150 }).success);
    assert.equal(adminStoreCreditIssuePayloadSchema.safeParse({ userId: id(3), credit: -5 }).success, false);
    assert.equal(adminStoreCreditIssuePayloadSchema.safeParse({ userId: id(3), credit: 0 }).success, false);
  });

  void it('take the OD- id for an admin cancel', () => {
    const cancel = { uniqueId: 'OD-0000000001', userId: id(3), reason: 'Out of stock', notify: false };
    assert.ok(adminOrderCancelPayloadSchema.safeParse(cancel).success);
    assert.equal(adminOrderCancelPayloadSchema.safeParse({ ...cancel, uniqueId: id(4) }).success, false);
  });

  void it('coerce list queries and bound searches', () => {
    assert.deepEqual(adminOrderListQuerySchema.parse({ page: '2', status: 'paid' }), { page: 2, limit: 10, status: 'paid' });
    assert.equal(adminOrderListQuerySchema.safeParse({ status: 'lost' }).success, false);
    assert.deepEqual(adminProductSetListQuerySchema.parse({ categories: [id(2)] }), { page: 1, limit: 10, categories: [id(2)] });
    // A single value arrives as a string; the API also takes one comma-separated value.
    for (const categories of [id(2), `${id(2)},${id(3)}`]) {
      assert.deepEqual(adminProductSetListQuerySchema.parse({ categories }), { page: 1, limit: 10, categories });
    }
    for (const categories of ['nope', `${id(2)},`, [id(2), 'nope'], { $ne: null }]) {
      const result = adminProductSetListQuerySchema.safeParse({ categories });
      assert.equal(result.success, false, JSON.stringify(categories));
      assert.equal(result.error?.issues[0]?.message, 'INVALID_ID');
    }
    // '' (no category selected in the admin deal form) is no filter.
    for (const schema of [adminProductSetListQuerySchema, adminProductSetListFilterSchema]) {
      const parsed = schema.safeParse({ categories: '' });
      assert.ok(parsed.success);
      assert.equal(parsed.data.categories, undefined);
    }
    assert.equal(adminAddOnListQuerySchema.safeParse({ sortBy: 'price' }).success, false);
    assert.equal(adminSearchQuerySchema.safeParse({ q: '   ' }).success, false);
    assert.equal(adminSearchQuerySchema.safeParse({ q: 'x'.repeat(101) }).success, false);
  });

  void it('check every reference list the API enforces', () => {
    for (const [schema, key] of [
      [adminAuthorBooksPayloadSchema, 'books'],
      [adminProductSetReferencesPayloadSchema, 'categories'],
      [adminBookReferencesPayloadSchema, 'categories'],
      [adminBookReferencesPayloadSchema, 'relatedBooks'],
      [adminBookReferencesPayloadSchema, 'relatedBundles'],
      [adminBookReferencesPayloadSchema, 'relatedCollections'],
      [adminCollectionReferencesPayloadSchema, 'books'],
      [adminCollectionReferencesPayloadSchema, 'relatedCollections'],
      [adminCollectionReferencesPayloadSchema, 'relatedCategories'],
      [adminCollectionReferencesPayloadSchema, 'featuredAuthors'],
      [adminBundleReferencesPayloadSchema, 'bundledBooks'],
      [adminBundleReferencesPayloadSchema, 'categories'],
      [adminBundleReferencesPayloadSchema, 'relatedBundles'],
      [adminBundleReferencesPayloadSchema, 'relatedCollections'],
    ] as const) {
      assert.deepEqual(schema.parse({ [key]: [id(2)], title: 'kept out' }), { [key]: [id(2)] });
      assert.deepEqual(schema.parse({}), {});
      assert.equal(schema.safeParse({ [key]: [id(2), 'nope'] }).error?.issues[0]?.message, 'INVALID_ID');
      for (const value of [id(2), [{ $gt: '' }], null])
        assert.equal(schema.safeParse({ [key]: value }).success, false, JSON.stringify(value));
    }
  });

  void it('check the book author and the product-set entries as references', () => {
    assert.ok(adminBookReferencesPayloadSchema.safeParse({ author: id(1) }).success);
    assert.ok(adminBookReferencesPayloadSchema.safeParse({ author: null }).success);
    assert.equal(adminBookReferencesPayloadSchema.safeParse({ author: 'nope' }).error?.issues[0]?.message, 'INVALID_ID');
    assert.ok(adminProductSetReferencesPayloadSchema.safeParse({ products: [{ product: id(1), priority: 1 }] }).success);
    // The legacy admin sends the populated book; only its `_id` is checked.
    const book = { _id: id(1), title: 'The Placeholder Atlas', price: 499 };
    assert.ok(adminProductSetReferencesPayloadSchema.safeParse({ products: [{ product: book, priority: 1 }] }).success);
    const badBook = { ...book, _id: 'nope' };
    for (const products of [
      [{ product: 'nope', priority: 1 }],
      [{ product: badBook, priority: 1 }],
      [{ product: { title: 'x' }, priority: 1 }],
      [id(1)],
      id(1),
      null,
    ]) {
      assert.equal(adminProductSetReferencesPayloadSchema.safeParse({ products }).success, false, JSON.stringify(products));
    }
  });

  void it('limit uploads to the known file modules', () => {
    assert.ok(adminFileUploadFieldsSchema.safeParse({ fileModule: 'AUTHOR', title: 'A. Writer' }).success);
    assert.equal(adminFileUploadFieldsSchema.safeParse({ fileModule: 'SECRETS', title: 'x' }).success, false);
  });
});
