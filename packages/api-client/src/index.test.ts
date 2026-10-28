import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import type { Category, CategoryListItem, Paginated } from '@pageaters/shared';

import { bindEndpoints, ClientErrorCode, createApiClient, createRequester, defineEndpoint, isApiError } from './index.ts';
import type { CallOptions, EndpointCall, QueryValue } from './index.ts';
import { mockFetch, ok } from './testing/mock-fetch.ts';

const BASE = 'https://api.example.test/api/v1/';

const category: Category = {
  _id: '64b7f0c2a1e4d3b2c1a09f8e',
  createdAt: '2023-04-05T06:07:08.090Z',
  updatedAt: '2023-04-05T06:07:08.090Z',
  categoryId: 'CA-0123456789',
  title: 'Fiction',
  description: 'Stories.',
  thumbnail: 'https://images.example.test/fiction.jpg',
  priority: 1,
  popularity: 10,
  numberOfBooks: 3,
  meta: { title: 'Fiction', description: 'Stories.', imageUrl: 'https://images.example.test/fiction.jpg', url: '/categories/fiction' },
};

// Compile-time only: `typecheck` fails if the inferred client types drift.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Client = ReturnType<typeof createApiClient>;
const _detailReturns: Same<Awaited<ReturnType<Client['categories']['detail']>>, Category> = true;
const _listReturns: Same<Awaited<ReturnType<Client['categories']['list']>>, Paginated<CategoryListItem>> = true;
const _detailInput: Same<Parameters<Client['categories']['detail']>, [input: { id: string | number }, options?: CallOptions]> = true;
// Preprocessed shared query fields (input type `unknown`) are narrowed to query-string values.
const _listInput: Same<
  Parameters<Client['categories']['list']>[0],
  { page?: QueryValue; limit?: QueryValue; sortBy?: QueryValue; sortOrder?: QueryValue } | undefined
> = true;

// A body endpoint takes path params and body fields in one object; a typed query keeps its own field types.
const _bodyEndpoint = defineEndpoint({
  method: 'PUT',
  path: '/categories/:id',
  body: z.object({ title: z.string(), priority: z.number().optional() }),
  response: z.object({ _id: z.string() }),
});
const _bodyInput: Same<
  Parameters<EndpointCall<typeof _bodyEndpoint>>[0],
  { id: string | number; title: string; priority?: number | undefined }
> = true;
const _queryEndpoint = defineEndpoint({ method: 'GET', path: '/x', query: z.object({ q: z.string() }), response: z.null() });
const _queryInput: Same<Parameters<EndpointCall<typeof _queryEndpoint>>, [input: { q: string }, options?: CallOptions]> = true;

function typeErrors(client: Client) {
  // @ts-expect-error the path param is required
  void client.categories.detail({});
  // @ts-expect-error the input itself is required when it has a required field
  void client.categories.detail();
  // @ts-expect-error path params are strings or numbers
  void client.categories.detail({ id: true });
  // @ts-expect-error query values must be serialisable
  void client.categories.list({ page: { nested: 1 } });
  // @ts-expect-error an endpoint takes a query or a body, not both
  defineEndpoint({ method: 'GET', path: '/x', query: z.object({}), body: z.object({}), response: z.null() });
}
void typeErrors;

void describe('createApiClient', () => {
  void it('calls GET /categories with the query and resolves to the page', async () => {
    const page = {
      docs: [],
      totalDocs: 0,
      limit: 5,
      totalPages: 0,
      page: 2,
      pagingCounter: 6,
      hasPrevPage: true,
      hasNextPage: false,
      prevPage: 1,
      nextPage: null,
    };
    const { fetch, calls } = mockFetch(() => ok(page, 'CATEGORY_LIST_SUCCESS'));
    const client = createApiClient({ baseUrl: BASE, fetch });
    assert.deepEqual(await client.categories.list({ page: 2, limit: 5, sortOrder: 'asc', sortBy: undefined }), page);
    assert.equal(calls[0]?.url, 'https://api.example.test/api/v1/categories?page=2&limit=5&sortOrder=asc');
    assert.equal(calls[0]?.init.method, 'GET');

    await client.categories.list();
    assert.equal(calls[1]?.url, 'https://api.example.test/api/v1/categories');
  });

  void it('fills and encodes the path param and keeps it out of the query', async () => {
    const { fetch, calls } = mockFetch(() => ok(category));
    const client = createApiClient({ baseUrl: BASE, fetch });
    assert.deepEqual(await client.categories.detail({ id: 'CA 1/2' }), category);
    assert.equal(calls[0]?.url, 'https://api.example.test/api/v1/categories/unique/CA%201%2F2');
  });

  void it('passes call options through', async () => {
    const { fetch, calls } = mockFetch(() => ok(category));
    const client = createApiClient({ baseUrl: BASE, fetch });
    await client.categories.detail({ id: 'CA-1' }, { next: { tags: ['category:CA-1'] }, cache: 'force-cache' });
    assert.deepEqual(calls[0]?.init.next, { tags: ['category:CA-1'] });
    assert.equal(calls[0]?.init.cache, 'force-cache');
  });

  void it('validates against the shared schema only when asked', async () => {
    const { fetch } = mockFetch(() => ok({ ...category, thumbnail: 'http://insecure.example.test/x.jpg' }));
    const client = createApiClient({ baseUrl: BASE, fetch });
    assert.equal((await client.categories.detail({ id: 'CA-1' })).thumbnail, 'http://insecure.example.test/x.jpg');

    const error: unknown = await client.categories.detail({ id: 'CA-1' }, { validate: true }).catch((e: unknown) => e);
    assert.ok(isApiError(error));
    assert.equal(error.code, ClientErrorCode.VALIDATION_FAILED);
    assert.deepEqual(error.issues[0]?.path, ['thumbnail']);
  });

  void it('exposes the low-level request for calls no endpoint describes', async () => {
    const { fetch, calls } = mockFetch(() => ok({ fileUrl: 'cover.jpg' }));
    const client = createApiClient({ baseUrl: BASE, fetch });
    assert.deepEqual(await client.request({ method: 'POST', path: '/file/upload', body: new FormData() }), { fileUrl: 'cover.jpg' });
    assert.equal(calls[0]?.url, 'https://api.example.test/api/v1/file/upload');
  });
});

void describe('bindEndpoints', () => {
  void it('sends the non-path fields of a body endpoint as JSON, and nests groups', async () => {
    const { fetch, calls } = mockFetch(() => ok({ _id: 'c1' }));
    const bound = bindEndpoints({ admin: { categories: { update: _bodyEndpoint } } }, createRequester({ baseUrl: BASE, fetch }));
    assert.deepEqual(await bound.admin.categories.update({ id: 'c1', title: 'Poetry' }), { _id: 'c1' });
    assert.equal(calls[0]?.url, 'https://api.example.test/api/v1/categories/c1');
    assert.equal(calls[0]?.init.method, 'PUT');
    assert.equal(calls[0]?.init.body, '{"title":"Poetry"}');
  });

  void it('sends nothing but the path for an endpoint without query or body', async () => {
    const { fetch, calls } = mockFetch(() => ok(category));
    const bound = bindEndpoints(
      { detail: defineEndpoint({ method: 'DELETE', path: '/categories/:id', response: z.object({}) }) },
      createRequester({ baseUrl: BASE, fetch }),
    );
    await bound.detail({ id: 'c1' });
    assert.equal(calls[0]?.url, 'https://api.example.test/api/v1/categories/c1');
    assert.equal(calls[0]?.init.body, undefined);
  });
});
