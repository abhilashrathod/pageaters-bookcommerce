import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { hangUntilAborted, json, mockFetch, ok } from '../testing/mock-fetch.ts';
import { ApiError, ClientErrorCode, isApiError } from './errors.ts';
import { createRequester } from './http.ts';
import type { ApiClientOptions } from './http.ts';

const BASE = 'https://api.example.test/api/v1';

function setup(handler?: Parameters<typeof mockFetch>[0], options: Omit<ApiClientOptions, 'baseUrl' | 'fetch'> = {}) {
  const mock = mockFetch(handler);
  return { ...mock, request: createRequester({ baseUrl: BASE, fetch: mock.fetch, ...options }) };
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(isApiError(error), `expected an ApiError, got ${String(error)}`);
    return error;
  }
  assert.fail('expected the call to reject');
}

void describe('request', () => {
  void it('unwraps the envelope to its data', async () => {
    const { request } = setup(() => ok({ title: 'Fiction' }, 'CATEGORY_LIST_SUCCESS'));
    assert.deepEqual(await request({ method: 'GET', path: '/categories' }), { title: 'Fiction' });
  });

  void it('unwraps `res.created` envelopes, which have no status key', async () => {
    const { request } = setup(() => json({ statusCode: 201, message: 'Created', data: { _id: 'x' } }, 201));
    assert.deepEqual(await request({ method: 'POST', path: '/categories', body: {} }), { _id: 'x' });
  });

  void it('sends cookies by default and honours another credentials mode', async () => {
    const byDefault = setup();
    await byDefault.request({ method: 'GET', path: '/' });
    assert.equal(byDefault.calls[0]?.init.credentials, 'include');

    const omitted = setup(undefined, { credentials: 'omit' });
    await omitted.request({ method: 'GET', path: '/' });
    assert.equal(omitted.calls[0]?.init.credentials, 'omit');
  });

  void it('builds the URL from the base, path and query', async () => {
    const { request, calls } = setup();
    await request({ method: 'GET', path: '/categories', query: { page: 2, sortBy: undefined } });
    assert.equal(calls[0]?.url, `${BASE}/categories?page=2`);
    assert.equal(calls[0]?.init.method, 'GET');
  });

  void it('resolves an async headers function per call, merging call headers over it', async () => {
    let n = 0;
    const { request, calls } = setup(undefined, {
      headers: async () => {
        await Promise.resolve();
        n += 1;
        return { cookie: `_PID=token-${n}`, 'x-client': 'storefront' };
      },
    });
    await request({ method: 'GET', path: '/' });
    await request({ method: 'GET', path: '/' }, { headers: { 'x-client': 'override' } });
    assert.equal(calls[0]?.init.headers.get('cookie'), '_PID=token-1');
    assert.equal(calls[1]?.init.headers.get('cookie'), '_PID=token-2');
    assert.equal(calls[0]?.init.headers.get('x-client'), 'storefront');
    assert.equal(calls[1]?.init.headers.get('x-client'), 'override');
    assert.equal(calls[0]?.init.headers.get('accept'), 'application/json');
  });

  void it('JSON-encodes bodies and passes FormData through untouched', async () => {
    const { request, calls } = setup();
    await request({ method: 'POST', path: '/cart/add', body: { product: 'p1', quantity: 2 } });
    assert.equal(calls[0]?.init.body, '{"product":"p1","quantity":2}');
    assert.equal(calls[0]?.init.headers.get('content-type'), 'application/json');

    const form = new FormData();
    form.set('title', 'cover');
    await request({ method: 'POST', path: '/file/upload', body: form });
    assert.equal(calls[1]?.init.body, form);
    assert.equal(calls[1]?.init.headers.get('content-type'), null, 'fetch must set the multipart boundary itself');

    await request({ method: 'GET', path: '/categories' });
    assert.equal(calls[2]?.init.body, undefined);
    assert.equal(calls[2]?.init.headers.get('content-type'), null);
  });

  void it("passes Next.js's cache options straight through, and leaves them out when unset", async () => {
    const { request, calls } = setup();
    await request({ method: 'GET', path: '/categories' }, { cache: 'force-cache', next: { tags: ['categories'], revalidate: 3600 } });
    await request({ method: 'GET', path: '/categories' });
    assert.equal(calls[0]?.init.cache, 'force-cache');
    assert.deepEqual(calls[0]?.init.next, { tags: ['categories'], revalidate: 3600 });
    assert.equal('cache' in (calls[1]?.init ?? {}), false);
    assert.equal('next' in (calls[1]?.init ?? {}), false);
  });
});

void describe('errors', () => {
  void it("throws the API's error envelope as an ApiError, keeping its code and data", async () => {
    const { request } = setup(() =>
      json(
        { statusCode: 400, status: 'CATEGORY_NOT_EXIST', message: 'Category does not exist', error: 'Category does not exist', data: {} },
        400,
      ),
    );
    const error = await rejection(request({ method: 'GET', path: '/categories/unique/CA-1' }));
    assert.ok(error instanceof ApiError);
    assert.equal(error.name, 'ApiError');
    assert.equal(error.statusCode, 400);
    assert.equal(error.code, 'CATEGORY_NOT_EXIST');
    assert.equal(error.message, 'Category does not exist');
    assert.deepEqual(error.data, {});
  });

  void it('treats an error status in a 200 body as an error', async () => {
    const { request } = setup(() => json({ statusCode: 403, status: 'FORBIDDEN', message: 'Forbidden', data: {} }, 200));
    const error = await rejection(request({ method: 'GET', path: '/' }));
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, 'FORBIDDEN');
  });

  void it('calls onUnauthorized before throwing a 401', async () => {
    const seen: string[] = [];
    const { request } = setup(() => json({ statusCode: 401, status: 'UNAUTHORIZED', message: 'Invalid token', data: {} }, 401), {
      onUnauthorized: async (error) => {
        await Promise.resolve();
        seen.push(error.code);
      },
    });
    const error = await rejection(request({ method: 'GET', path: '/auth/me' }));
    assert.equal(error.code, 'UNAUTHORIZED');
    assert.deepEqual(seen, ['UNAUTHORIZED']);
  });

  void it('does not call onUnauthorized for other errors', async () => {
    let called = false;
    const { request } = setup(() => json({ statusCode: 403, status: 'FORBIDDEN', message: 'Forbidden', data: {} }, 403), {
      onUnauthorized: () => {
        called = true;
      },
    });
    await rejection(request({ method: 'GET', path: '/' }));
    assert.equal(called, false);
  });

  void it('reports a non-JSON error page as an HTTP error with its status', async () => {
    const { request } = setup(() => new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }));
    const error = await rejection(request({ method: 'GET', path: '/' }));
    assert.equal(error.code, ClientErrorCode.HTTP_ERROR);
    assert.equal(error.statusCode, 502);
    assert.equal(error.data, '<html>Bad gateway</html>');
  });

  void it('reports a 2xx answer that is not the envelope as an invalid response', async () => {
    for (const body of ['not json', '', '[1,2]', '{"name":"API"}']) {
      const { request } = setup(() => new Response(body, { status: 200 }));
      const error = await rejection(request({ method: 'GET', path: '/' }));
      assert.equal(error.code, ClientErrorCode.INVALID_RESPONSE, body);
      assert.equal(error.statusCode, 200);
    }
  });

  void it('reports a fetch rejection as a network error with the cause attached', async () => {
    const cause = new TypeError('fetch failed');
    const { request } = setup(() => Promise.reject(cause));
    const error = await rejection(request({ method: 'GET', path: '/' }));
    assert.equal(error.code, ClientErrorCode.NETWORK_ERROR);
    assert.equal(error.statusCode, 0);
    assert.equal(error.cause, cause);
  });

  void it('times out a call that never answers', async () => {
    const { request } = setup(hangUntilAborted, { timeoutMs: 10 });
    const error = await rejection(request({ method: 'GET', path: '/' }));
    assert.equal(error.code, ClientErrorCode.TIMEOUT);
    assert.equal(error.statusCode, 0);
  });

  void it('lets a call override the client timeout', async () => {
    const { request } = setup(hangUntilAborted, { timeoutMs: 0 });
    const error = await rejection(request({ method: 'GET', path: '/' }, { timeoutMs: 10 }));
    assert.equal(error.code, ClientErrorCode.TIMEOUT);
  });

  void it("aborts through the caller's signal, before or during the call", async () => {
    const { request, calls } = setup(hangUntilAborted);
    const controller = new AbortController();
    const pending = request({ method: 'GET', path: '/' }, { signal: controller.signal });
    controller.abort();
    assert.equal((await rejection(pending)).code, ClientErrorCode.ABORTED);

    const error = await rejection(request({ method: 'GET', path: '/' }, { signal: AbortSignal.abort() }));
    assert.equal(error.code, ClientErrorCode.ABORTED);
    assert.equal(calls.length, 1, 'an already-aborted call never reaches fetch');
  });

  void it('recognises errors across copies of the package', () => {
    assert.ok(isApiError(new ApiError({ statusCode: 400, code: 'X', message: 'x' })));
    const foreign = Object.assign(new Error('x'), { [Symbol.for('@pageaters/api-client/ApiError')]: true });
    assert.ok(isApiError(foreign));
    assert.equal(isApiError(new Error('x')), false);
    assert.equal(isApiError({ code: 'X', statusCode: 400 }), false);
    assert.equal(isApiError(null), false);
  });
});

void describe('validation', () => {
  const schema = z.object({ title: z.string() });
  const mismatching = () => ok({ title: 42 });

  void it('is off by default: no parsing, a mismatching body still resolves', async () => {
    const { request } = setup(mismatching);
    assert.deepEqual(await request({ method: 'GET', path: '/', response: schema }), { title: 42 });
  });

  void it('when on, throws a validation error with the issues', async () => {
    const { request } = setup(mismatching, { validate: true });
    const error = await rejection(request({ method: 'GET', path: '/x', response: schema }));
    assert.equal(error.code, ClientErrorCode.VALIDATION_FAILED);
    assert.equal(error.statusCode, 200);
    assert.deepEqual(error.issues[0]?.path, ['title']);
    assert.deepEqual(error.data, { title: 42 });
  });

  void it('when on, returns the parsed data (unknown keys stripped)', async () => {
    const { request } = setup(() => ok({ title: 'Fiction', __v: 0 }), { validate: true });
    assert.deepEqual(await request({ method: 'GET', path: '/', response: schema }), { title: 'Fiction' });
  });

  void it('can be switched per call either way', async () => {
    const off = setup(mismatching, { validate: true });
    assert.deepEqual(await off.request({ method: 'GET', path: '/', response: schema }, { validate: false }), { title: 42 });

    const on = setup(mismatching);
    const error = await rejection(on.request({ method: 'GET', path: '/', response: schema }, { validate: true }));
    assert.equal(error.code, ClientErrorCode.VALIDATION_FAILED);
  });
});
