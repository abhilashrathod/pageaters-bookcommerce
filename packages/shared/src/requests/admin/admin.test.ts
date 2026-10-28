import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { z } from 'zod';

import {
  adminAddOnListQuerySchema,
  adminAuthorUpdatePayloadSchema,
  adminBookCreatePayloadSchema,
  adminBookUpdatePayloadSchema,
  adminBundleUpdatePayloadSchema,
  adminCategoryCreatePayloadSchema,
  adminFileUploadFieldsSchema,
  adminOrderCancelPayloadSchema,
  adminOrderListQuerySchema,
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

  void it('require the lists the controllers iterate, and every field on update', () => {
    const { categories: _c, ...noCategories } = bookCreate;
    assert.equal(adminBookCreatePayloadSchema.safeParse(noCategories).success, false);
    const { price: _p, ...noPrice } = bookUpdate;
    assert.equal(adminBookUpdatePayloadSchema.safeParse(noPrice).success, false);
  });

  void it('reject a non-https poster', () => {
    assert.equal(adminBookCreatePayloadSchema.safeParse({ ...bookCreate, poster: 'atlas.jpg' }).success, false);
  });
});

void describe('other admin payloads', () => {
  void it('type the catalog writes from the field schemas', () => {
    assert.ok(adminCategoryCreatePayloadSchema.safeParse({ title: 'Poetry' }).success);
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
    assert.equal(adminAddOnListQuerySchema.safeParse({ sortBy: 'price' }).success, false);
    assert.equal(adminSearchQuerySchema.safeParse({ q: '   ' }).success, false);
    assert.equal(adminSearchQuerySchema.safeParse({ q: 'x'.repeat(101) }).success, false);
  });

  void it('limit uploads to the known file modules', () => {
    assert.ok(adminFileUploadFieldsSchema.safeParse({ fileModule: 'AUTHOR', title: 'A. Writer' }).success);
    assert.equal(adminFileUploadFieldsSchema.safeParse({ fileModule: 'SECRETS', title: 'x' }).success, false);
  });
});
