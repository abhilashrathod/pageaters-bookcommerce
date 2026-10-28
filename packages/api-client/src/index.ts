import { bindEndpoints } from './core/endpoint.ts';
import type { BoundTree } from './core/endpoint.ts';
import { createRequester } from './core/http.ts';
import type { ApiClientOptions, Requester } from './core/http.ts';
import { adminEndpoints } from './endpoints/admin/index.ts';
import { shopperEndpoints } from './endpoints/shopper/index.ts';

export * from './core/errors.ts';
export * from './core/endpoint.ts';
export * from './core/http.ts';
export * from './core/url.ts';
// Multipart upload helpers for `client.request` (POST /file/upload is not a bound endpoint; see endpoints/admin/files.ts).
export { fileUploadForm, fileUploadRequest } from './endpoints/admin/index.ts';
export type { FileUploadInput } from './endpoints/admin/index.ts';

// Every resource the client exposes. This registry is the orchestrator's: endpoint folders never edit it, and the
// orchestrator mounts each new folder at merge. Admin resources sit under `admin` so they never clash with shopper ones.
export const endpoints = {
  ...shopperEndpoints,
  admin: adminEndpoints,
};

// Compile-time guard: `request` is the client's escape hatch, so no resource may take that name.
type AssertTrue<Condition extends true> = Condition;
type _NoResourceNamedRequest = AssertTrue<'request' extends keyof typeof endpoints ? false : true>;

export type ApiClient = BoundTree<typeof endpoints> & {
  // Escape hatch for a call no endpoint describes yet; resolves to the envelope's `data`.
  readonly request: Requester;
};

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createRequester(options);
  return { ...bindEndpoints(endpoints, request), request };
}
