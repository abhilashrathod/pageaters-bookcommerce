import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';
import {
  AddressType,
  addressTypeSchema,
  BookAvailability,
  bookAvailabilitySchema,
  BookVersion,
  bookVersionSchema,
  OrderRequestStatus,
  orderRequestStatusSchema,
  OrderRequestType,
  orderRequestTypeSchema,
  OrderStatus,
  orderStatusSchema,
  PaymentMethod,
  paymentMethodSchema,
  ProductType,
  productTypeSchema,
  ReadingLevel,
  readingLevelSchema,
  UserRole,
  userRoleSchema,
  UserStatus,
  userStatusSchema,
} from './enums.ts';

// node:test's describe/it return promises the runner tracks itself.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

// Shared enum → the key it was ported from in apps/api/src/constants/enums.js.
const enums: [apiKey: string, object: Record<string, string>, schema: z.ZodType][] = [
  ['USER_ROLES', UserRole, userRoleSchema],
  ['USER_STATUS', UserStatus, userStatusSchema],
  ['ADDRESS_TYPES', AddressType, addressTypeSchema],
  ['PRODUCT_TYPES', ProductType, productTypeSchema],
  ['BOOK_VERSIONS', BookVersion, bookVersionSchema],
  ['READING_LEVEL', ReadingLevel, readingLevelSchema],
  ['BOOK_AVAILABILITY', BookAvailability, bookAvailabilitySchema],
  ['ORDER_STAGES', OrderStatus, orderStatusSchema],
  ['ORDER_REQUEST_TYPES', OrderRequestType, orderRequestTypeSchema],
  ['ORDER_REQUEST_STATUS', OrderRequestStatus, orderRequestStatusSchema],
  ['PAYMENT_METHODS', PaymentMethod, paymentMethodSchema],
];

void describe('enum schemas', () => {
  void it('accept every value of their object and nothing else', () => {
    for (const [apiKey, object, schema] of enums) {
      for (const value of Object.values(object)) assert.ok(schema.safeParse(value).success, `${apiKey} ${value}`);
      assert.equal(schema.safeParse('').success, false, apiKey);
      const first = Object.values(object)[0] ?? '';
      const otherCase = first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase();
      assert.equal(schema.safeParse(otherCase).success, false, `${apiKey} ${otherCase}`);
    }
  });
});

// The API's enums.js is what Mongoose validates against (`enum: Object.values(enums.X)` in the models). It goes
// away when the API imports this package (Phase 4); the check is skipped from then on.
const apiEnumsPath = `${repoRoot}apps/api/src/constants/enums.js`;
void describe('parity with the API', { skip: !existsSync(apiEnumsPath) && 'apps/api enums.js is gone' }, () => {
  void it('has exactly the stored values of each ported API enum', () => {
    const api = createRequire(import.meta.url)(apiEnumsPath) as Record<string, Record<string, string>>;
    for (const [apiKey, object] of enums) {
      const apiValues = Object.values(api[apiKey] ?? {}).sort();
      assert.deepEqual(Object.values(object).sort(), apiValues, apiKey);
    }
  });
});

// seed/data is generated locally and gitignored; skipped where it is absent (CI, fresh worktrees).
const booksPath = `${repoRoot}seed/data/store-books.json`;
void describe('seed catalog', { skip: !existsSync(booksPath) && 'seed/data is absent' }, () => {
  void it('uses only known book enum values', () => {
    const books = JSON.parse(readFileSync(booksPath, 'utf8')) as Record<string, unknown>[];
    const fields: [string, z.ZodType][] = [
      ['type', productTypeSchema],
      ['version', bookVersionSchema],
      ['readingLevel', readingLevelSchema],
      ['availability', bookAvailabilitySchema],
    ];
    for (const book of books) {
      for (const [field, schema] of fields) {
        if (book[field] === undefined) continue;
        assert.ok(schema.safeParse(book[field]).success, `${String(book.bookId)} ${field}=${JSON.stringify(book[field])}`);
      }
    }
  });
});
