import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  apiErrorResponseSchema,
  apiResponse,
  imageUrlSchema,
  isoDateSchema,
  moneySchema,
  objectIdSchema,
  paginated,
  paginationQuerySchema,
  sortOrderSchema,
} from './primitives.ts';
import type { ApiResponse, Paginated } from './primitives.ts';

// Compile-time only: `typecheck` fails if the hand-written generic types drift from their schemas.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _item = z.object({ title: z.string() });
type Item = z.infer<typeof _item>;
const _paginatedMatches: Same<Paginated<Item>, z.infer<ReturnType<typeof paginated<typeof _item>>>> = true;
const _apiResponseMatches: Same<ApiResponse<Item>, z.infer<ReturnType<typeof apiResponse<typeof _item>>>> = true;

void describe('objectIdSchema', () => {
  void it('accepts 24 hex characters in either case', () => {
    assert.ok(objectIdSchema.safeParse('64b7f0c2a1e4d3b2c1a09f8e').success);
    assert.ok(objectIdSchema.safeParse('64B7F0C2A1E4D3B2C1A09F8E').success);
  });

  void it('rejects other strings with the API error code', () => {
    for (const value of ['', '64b7f0c2a1e4d3b2c1a09f8', '64b7f0c2a1e4d3b2c1a09f8e0', 'zzb7f0c2a1e4d3b2c1a09f8e']) {
      const result = objectIdSchema.safeParse(value);
      assert.equal(result.success, false, value);
      assert.equal(result.error?.issues[0]?.message, 'INVALID_ID');
    }
    assert.equal(objectIdSchema.safeParse(42).success, false);
  });
});

void describe('isoDateSchema', () => {
  void it('accepts Mongoose timestamps as serialised to JSON', () => {
    assert.ok(isoDateSchema.safeParse(new Date('2023-04-05T06:07:08.090Z').toJSON()).success);
    assert.ok(isoDateSchema.safeParse('2023-04-05T11:37:08+05:30').success);
  });

  void it('rejects dates without a time and empty strings', () => {
    assert.equal(isoDateSchema.safeParse('2023-04-05').success, false);
    assert.equal(isoDateSchema.safeParse('').success, false);
  });
});

void describe('moneySchema', () => {
  void it('accepts whole rupees and rupees with paise', () => {
    for (const value of [0, 499, 599.25, 249.5, 0.29, 1234.99]) assert.ok(moneySchema.safeParse(value).success, String(value));
  });

  void it('rejects negatives, fractions of a paisa and non-numbers', () => {
    for (const value of [-1, 0.001, 10.555, Number.NaN, Number.POSITIVE_INFINITY, '499']) {
      assert.equal(moneySchema.safeParse(value).success, false, String(value));
    }
  });
});

void describe('imageUrlSchema', () => {
  void it('accepts https URLs such as Vercel Blob', () => {
    assert.ok(imageUrlSchema.safeParse('https://abc123.public.blob.vercel-storage.com/books/cover.webp').success);
  });

  void it('rejects http, relative paths, bare keys and empty strings', () => {
    for (const value of ['http://example.com/a.png', '/images/a.png', 'cover.jpg', '', 'javascript:alert(1)']) {
      assert.equal(imageUrlSchema.safeParse(value).success, false, value);
    }
  });
});

void describe('sortOrderSchema', () => {
  void it('normalises every spelling the frontends send to 1 or -1', () => {
    const cases: [unknown, 1 | -1][] = [
      ['asc', 1],
      ['ascending', 1],
      ['1', 1],
      [1, 1],
      ['desc', -1],
      ['descending', -1],
      ['-1', -1],
      [-1, -1],
    ];
    for (const [input, expected] of cases) assert.equal(sortOrderSchema.parse(input), expected, String(input));
  });

  void it('defaults to newest first and rejects anything else', () => {
    assert.equal(sortOrderSchema.parse(undefined), -1);
    assert.equal(sortOrderSchema.parse(''), -1);
    assert.equal(sortOrderSchema.safeParse('up').success, false);
    assert.equal(sortOrderSchema.safeParse(0).success, false);
  });
});

void describe('paginationQuerySchema', () => {
  void it('applies defaults to an empty query', () => {
    assert.deepEqual(paginationQuerySchema.parse({}), { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: -1 });
  });

  void it('treats empty strings as missing, as the admin sends them', () => {
    assert.deepEqual(paginationQuerySchema.parse({ page: '', limit: '', sortBy: '', sortOrder: '' }), {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: -1,
    });
  });

  void it('coerces query-string values', () => {
    assert.deepEqual(paginationQuerySchema.parse({ page: '2', limit: '25', sortBy: ' priority ', sortOrder: 'asc' }), {
      page: 2,
      limit: 25,
      sortBy: 'priority',
      sortOrder: 1,
    });
  });

  void it('rejects out-of-range and non-integer values', () => {
    for (const query of [{ page: '0' }, { page: '1.5' }, { page: 'two' }, { limit: '0' }, { limit: '1001' }]) {
      assert.equal(paginationQuerySchema.safeParse(query).success, false, JSON.stringify(query));
    }
  });

  void it('lets an endpoint restrict sortBy', () => {
    const books = paginationQuerySchema.extend({ sortBy: z.enum(['title', 'createdAt']).default('createdAt') });
    assert.equal(books.parse({ sortBy: 'title' }).sortBy, 'title');
    assert.equal(books.safeParse({ sortBy: 'password' }).success, false);
  });
});

void describe('paginated + apiResponse', () => {
  const page = {
    docs: [{ title: 'A' }],
    totalDocs: 21,
    limit: 10,
    totalPages: 3,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: true,
    prevPage: null,
    nextPage: 2,
  };
  const schema = apiResponse(paginated(z.object({ title: z.string() })));

  void it('parses a list response as the API sends it', () => {
    const body = { statusCode: 200, status: 'BOOK_LIST_SUCCESS', message: 'Books fetched', data: page };
    assert.deepEqual(schema.parse(body), body);
  });

  void it('accepts `res.created` responses, which have no status key', () => {
    assert.ok(apiResponse(z.object({})).safeParse({ statusCode: 201, message: 'Created', data: {} }).success);
  });

  void it('validates the items', () => {
    const bad = { statusCode: 200, status: 'OK', message: 'OK', data: { ...page, docs: [{ title: 1 }] } };
    assert.equal(schema.safeParse(bad).success, false);
  });

  void it('parses the error wrapper', () => {
    const body = { statusCode: 400, status: 'INVALID_ID', message: 'Invalid id', error: 'Invalid id', data: {} };
    assert.deepEqual(apiErrorResponseSchema.parse(body), body);
  });
});
