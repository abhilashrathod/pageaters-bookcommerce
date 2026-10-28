import { ApiError, ClientErrorCode } from './errors.ts';
import type { ValidationIssue } from './errors.ts';
import { buildUrl } from './url.ts';
import type { QueryParams } from './url.ts';

// The fetch wrapper. Only globals shared by browsers, Next.js (server and client) and Node 22 are used.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Spelled out instead of the DOM's `HeadersInit`/`RequestCredentials`/`RequestCache`, which Node-only
// TypeScript setups (no DOM lib) don't declare.
export type HeaderValues = Headers | Readonly<Record<string, string>> | ReadonlyArray<readonly [string, string]>;
export type HeaderSource = HeaderValues | (() => HeaderValues | Promise<HeaderValues>);
export type Credentials = 'include' | 'same-origin' | 'omit';
export type CacheMode = 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';

// Next.js's `fetch` extension, typed structurally so the client never imports Next. Other runtimes ignore it.
export interface NextFetchOptions {
  tags?: string[];
  revalidate?: number | false;
}

export interface FetchInit {
  method: HttpMethod;
  headers: Headers;
  body?: string | FormData;
  credentials: Credentials;
  // The API never redirects; following one could carry the forwarded cookies elsewhere.
  redirect: 'error';
  // Only set when the call can be aborted (a caller signal or a timeout). Next.js skips request de-duplication
  // for a fetch with a signal, so a server client with `timeoutMs: 0` and no signal keeps it.
  signal?: AbortSignal;
  cache?: CacheMode;
  next?: NextFetchOptions;
}
// A custom implementation must honour `init.signal`, or timeouts and aborts can't stop it.
export type FetchLike = (url: string, init: FetchInit) => Promise<Response>;

// Something that can check the envelope's `data`: any zod schema fits.
export interface ResponseSchema<Output> {
  safeParse(data: unknown): { success: true; data: Output } | { success: false; error: { issues: readonly ValidationIssue[] } };
}

export const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiClientOptions {
  // The API root including its version prefix, e.g. 'https://api.demo.pageaters.com/api/v1' or '/api/v1'.
  baseUrl: string;
  // Defaults to the global `fetch`, looked up per call.
  fetch?: FetchLike;
  // Defaults to 'include': the API authenticates with httpOnly cookies set on its own domain.
  credentials?: Credentials;
  // Sent with every call. A function runs per call; the Next.js server uses it to forward the visitor's
  // cookies: `headers: async () => ({ cookie: (await cookies()).toString() })`.
  headers?: HeaderSource;
  // Parse each response's `data` with the endpoint's schema. Off by default (no parsing at all).
  validate?: boolean;
  // Abort a call that hasn't finished reading its body after this long. 0 turns the timeout off.
  timeoutMs?: number;
  // Called (and awaited) before a 401 `ApiError` is thrown, e.g. to clear client state and route to login. The
  // API has no refresh flow: a 401 means the session is gone (no cookie, invalid/expired token, inactive user).
  // If the hook throws, the 401 is still what the call rejects with, the hook's error attached as `cause`.
  onUnauthorized?: (error: ApiError) => void | Promise<void>;
}

export interface CallOptions {
  signal?: AbortSignal;
  // Overrides the client's `validate` for this call.
  validate?: boolean;
  // Overrides the client's `timeoutMs` for this call.
  timeoutMs?: number;
  // Merged over the client's headers.
  headers?: HeaderValues;
  cache?: CacheMode;
  next?: NextFetchOptions;
}

export interface RequestSpec<Output> {
  method: HttpMethod;
  // A filled path, starting with '/'.
  path: string;
  query?: QueryParams;
  // JSON-encoded, except FormData, which is sent as multipart (fetch sets the boundary header).
  body?: unknown;
  response?: ResponseSchema<Output>;
}

export type Requester = <Output>(spec: RequestSpec<Output>, call?: CallOptions) => Promise<Output>;

function mergeHeaders(target: Headers, source: HeaderValues | undefined): void {
  if (!source) return;
  new Headers(source as Headers).forEach((value, key) => target.set(key, value));
}

interface Envelope {
  statusCode: number;
  status?: unknown;
  message?: unknown;
  data?: unknown;
}

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && typeof (value as Envelope).statusCode === 'number';
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function errorFromBody(status: number, body: unknown, text: string, statusText: string): ApiError {
  if (isEnvelope(body) && typeof body.status === 'string') {
    return new ApiError({
      statusCode: status,
      code: body.status,
      message: typeof body.message === 'string' ? body.message : body.status,
      data: body.data,
    });
  }
  return new ApiError({
    statusCode: status,
    code: ClientErrorCode.HTTP_ERROR,
    message: `Request failed with status ${status}${statusText ? ` ${statusText}` : ''}`,
    data: text,
  });
}

export function createRequester(options: ApiClientOptions): Requester {
  return async function request<Output>(spec: RequestSpec<Output>, call: CallOptions = {}): Promise<Output> {
    const fetchImpl: FetchLike = options.fetch ?? globalThis.fetch;
    // Built first: an invalid path is a programming error (TypeError), not a network failure.
    const url = buildUrl(options.baseUrl, spec.path, spec.query);
    const headers = new Headers({ accept: 'application/json' });
    const resolved = typeof options.headers === 'function' ? await options.headers() : options.headers;
    mergeHeaders(headers, resolved);
    mergeHeaders(headers, call.headers);

    let body: string | FormData | undefined;
    if (spec.body instanceof FormData) {
      body = spec.body;
    } else if (spec.body !== undefined) {
      body = JSON.stringify(spec.body);
      headers.set('content-type', 'application/json');
    }

    // One controller for the call, created only when something can abort it: the caller's signal and the timeout
    // both abort it, and `reason` records which.
    const timeoutMs = call.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = call.signal || timeoutMs > 0 ? new AbortController() : undefined;
    let reason: 'aborted' | 'timeout' | undefined;
    const onCallerAbort = () => {
      reason ??= 'aborted';
      controller?.abort(call.signal?.reason);
    };
    if (call.signal?.aborted) onCallerAbort();
    else call.signal?.addEventListener('abort', onCallerAbort, { once: true });
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            reason ??= 'timeout';
            controller?.abort();
          }, timeoutMs)
        : undefined;

    const init: FetchInit = {
      method: spec.method,
      headers,
      credentials: options.credentials ?? 'include',
      redirect: 'error',
    };
    if (controller) init.signal = controller.signal;
    if (body !== undefined) init.body = body;
    if (call.cache !== undefined) init.cache = call.cache;
    if (call.next !== undefined) init.next = call.next;

    let response: Response;
    let text: string;
    try {
      if (controller?.signal.aborted) throw controller.signal.reason;
      response = await fetchImpl(url, init);
      text = await response.text();
    } catch (cause) {
      if (reason === 'timeout') {
        throw new ApiError({ statusCode: 0, code: ClientErrorCode.TIMEOUT, message: `Request timed out after ${timeoutMs} ms`, cause });
      }
      if (reason === 'aborted') {
        throw new ApiError({ statusCode: 0, code: ClientErrorCode.ABORTED, message: 'Request aborted', cause });
      }
      throw new ApiError({ statusCode: 0, code: ClientErrorCode.NETWORK_ERROR, message: 'Network request failed', cause });
    } finally {
      clearTimeout(timer);
      call.signal?.removeEventListener('abort', onCallerAbort);
    }

    const parsed = parseJson(text);
    // The API mirrors the HTTP status in the body's `statusCode`; either one at 400+ is an error.
    if (!response.ok || (isEnvelope(parsed) && parsed.statusCode >= 400)) {
      const error = errorFromBody(response.ok ? (parsed as Envelope).statusCode : response.status, parsed, text, response.statusText);
      if (error.statusCode === 401 && options.onUnauthorized) {
        try {
          await options.onUnauthorized(error);
        } catch (hookError) {
          const { statusCode, code, message, data } = error;
          throw new ApiError({ statusCode, code, message, data, cause: hookError });
        }
      }
      throw error;
    }
    if (!isEnvelope(parsed)) {
      throw new ApiError({
        statusCode: response.status,
        code: ClientErrorCode.INVALID_RESPONSE,
        message: 'Response is not the API envelope',
        data: text,
      });
    }

    const validate = call.validate ?? options.validate ?? false;
    if (!validate || !spec.response) return parsed.data as Output;
    const result = spec.response.safeParse(parsed.data);
    if (result.success) return result.data;
    throw new ApiError({
      statusCode: response.status,
      code: ClientErrorCode.VALIDATION_FAILED,
      message: `Response data does not match the schema for ${spec.method} ${spec.path}`,
      data: parsed.data,
      issues: result.error.issues,
    });
  };
}
