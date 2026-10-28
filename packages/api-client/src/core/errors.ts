// Every failure of a client call rejects with an `ApiError`, so callers handle one type:
// - the API answered with an error envelope (or any non-2xx status): `code` is the API's `status` key
//   (`CATEGORY_NOT_EXIST`, `UNAUTHORIZED`…) and `statusCode` the HTTP status;
// - the client could not get a usable answer: `code` is one of `ClientErrorCode` below. `statusCode` is 0 when
//   no response arrived at all (network failure, timeout, abort), otherwise the HTTP status.
// Client codes carry a `CLIENT_` prefix so they never collide with the API's own keys.
export const ClientErrorCode = {
  // fetch rejected: DNS, connection refused, CORS, offline…
  NETWORK_ERROR: 'CLIENT_NETWORK_ERROR',
  // The client's or call's `timeoutMs` elapsed before the body was read.
  TIMEOUT: 'CLIENT_TIMEOUT',
  // The caller's `signal` aborted the call.
  ABORTED: 'CLIENT_ABORTED',
  // A non-2xx answer without the API's JSON error envelope (a proxy's HTML 502, a plain-text 429…).
  HTTP_ERROR: 'CLIENT_HTTP_ERROR',
  // A 2xx answer that is not the API's JSON envelope.
  INVALID_RESPONSE: 'CLIENT_INVALID_RESPONSE',
  // Validation was on and the envelope's `data` did not match the endpoint's response schema; see `issues`.
  VALIDATION_FAILED: 'CLIENT_VALIDATION_FAILED',
} as const;
export type ClientErrorCode = (typeof ClientErrorCode)[keyof typeof ClientErrorCode];

// One problem found by response validation; a structural subset of zod's issue, so the declarations stay small.
export interface ValidationIssue {
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

export interface ApiErrorInit {
  statusCode: number;
  code: string;
  message: string;
  data?: unknown;
  issues?: readonly ValidationIssue[];
  cause?: unknown;
}

// `instanceof` fails when two copies of the package are bundled (a Next server and client chunk, or a linked
// workspace copy), so `isApiError` checks this registry-wide symbol instead.
const API_ERROR = Symbol.for('@pageaters/api-client/ApiError');

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly statusCode: number;
  readonly code: string;
  // The envelope's `data` (usually `{}`), or the unparsed body text for HTTP_ERROR / INVALID_RESPONSE.
  readonly data: unknown;
  readonly issues: readonly ValidationIssue[];

  constructor(init: ApiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.statusCode = init.statusCode;
    this.code = init.code;
    this.data = init.data;
    this.issues = init.issues ?? [];
    Object.defineProperty(this, API_ERROR, { value: true });
  }
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[API_ERROR] === true;
}
