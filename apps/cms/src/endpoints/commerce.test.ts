import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { commerceEndpoint } from './commerce.ts';

// The picker endpoint against a fake API (global fetch replaced): what it asks the API and what it answers.
const API = 'http://api.test/api/v1';
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const envelope = (data: unknown) => Response.json({ statusCode: 200, status: 'OK', message: 'ok', data });
const page = (titles: string[], hasNextPage: boolean, offset = 0) => ({
  docs: titles.map((title, index) => ({ _id: (offset + index).toString(16).padStart(24, '0'), title })),
  hasNextPage,
});

const fakeApi = (answer: (url: URL) => unknown) => {
  const seen: string[] = [];
  globalThis.fetch = (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    seen.push(url.pathname + url.search);
    return Promise.resolve(envelope(answer(url)));
  };
  return seen;
};

const call = async (kind: string, q = '', user: object | null = { id: 'u1', role: 'demo-readonly' }) => {
  const errors: unknown[] = [];
  const req = {
    user,
    routeParams: { kind },
    searchParams: new URLSearchParams({ q }),
    payload: { logger: { error: (...args: unknown[]) => errors.push(args) } },
  };
  const handler = commerceEndpoint(API).handler as unknown as (r: typeof req) => Promise<Response>;
  const res = await handler(req);
  return { status: res.status, body: (await res.json()) as { options?: { id: string; label: string }[] }, errors };
};

void test('needs a CMS session and a known kind', async () => {
  fakeApi(() => page([], false));
  assert.equal((await call('collections', '', null)).status, 401);
  assert.equal((await call('users')).status, 404);
});

void test('lists every page of a small catalog and filters by title', async () => {
  const seen = fakeApi((url) =>
    url.searchParams.get('page') === '1' ? page(['Classics', 'Thrillers'], true) : page(['Classic Romance'], false, 2),
  );
  const { status, body } = await call('collections', 'classic');
  assert.equal(status, 200);
  assert.deepEqual(
    body.options?.map((option) => option.label),
    ['Classics', 'Classic Romance'],
  );
  assert.deepEqual(seen, ['/api/v1/collections?page=1&limit=50', '/api/v1/collections?page=2&limit=50']);
});

void test('book boxes are the book list of type book_box; books use the search', async () => {
  const seen = fakeApi((url) => (url.pathname.endsWith('/search') ? [{ _id: 'a'.repeat(24), title: 'Dune' }] : page(['Cosy Box'], false)));
  assert.deepEqual((await call('book-boxes')).body.options, [{ id: '0'.repeat(24), label: 'Cosy Box' }]);
  assert.deepEqual((await call('books', 'du')).body.options, [{ id: 'a'.repeat(24), label: 'Dune' }]);
  assert.deepEqual((await call('books', 'd')).body.options, []);
  assert.deepEqual(seen, ['/api/v1/store-books?page=1&limit=50&type=book_box', '/api/v1/store-books/search?q=du']);
});

void test('answers 502 when the API is down', async () => {
  globalThis.fetch = () => Promise.reject(new TypeError('fetch failed'));
  const { status, errors } = await call('product-sets');
  assert.equal(status, 502);
  assert.equal(errors.length, 1);
});
