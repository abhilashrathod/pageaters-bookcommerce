import type { FetchInit, FetchLike } from '../core/http.ts';

// Test-only (excluded from the build): a `fetch` that records each call and answers from a handler.
export interface RecordedCall {
  url: string;
  init: FetchInit;
}

export type Handler = (url: string, init: FetchInit) => Response | Promise<Response>;

export function mockFetch(handler: Handler = () => json({ statusCode: 200, status: 'SUCCESS', message: 'Success', data: {} })) {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fetch, calls };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export function ok(data: unknown, status = 'SUCCESS'): Response {
  return json({ statusCode: 200, status, message: status, data });
}

// Never answers until the call's signal aborts, then rejects the way fetch does.
export const hangUntilAborted: Handler = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
  });
