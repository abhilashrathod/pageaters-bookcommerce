import { bindEndpoints } from './core/endpoint.ts';
import type { BoundTree } from './core/endpoint.ts';
import { createRequester } from './core/http.ts';
import type { ApiClientOptions, Requester } from './core/http.ts';
import { shopperEndpoints } from './endpoints/shopper/index.ts';

export * from './core/errors.ts';
export * from './core/endpoint.ts';
export * from './core/http.ts';
export * from './core/url.ts';

// Every resource the client exposes. Each endpoint folder adds itself here with one entry.
export const endpoints = {
  ...shopperEndpoints,
};

export type ApiClient = BoundTree<typeof endpoints> & {
  // Escape hatch for a call no endpoint describes yet; resolves to the envelope's `data`.
  readonly request: Requester;
};

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createRequester(options);
  return { ...bindEndpoints(endpoints, request), request };
}
