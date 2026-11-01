import { createApiClient } from '@pageaters/api-client';

import { env } from '@/env.ts';

// Catalog tag on every server-side API read. The API doesn't call /api/revalidate, so catalog data also expires
// hourly; the catalog is seeded once and read-only in the demo, so an hour of staleness is harmless.
export const CATALOG_TAG = 'api:catalog';

// Anonymous, cached catalog reads for Server Components (blocks, catalog pages). Shopper calls (cart, orders) use
// their own client with the visitor's cookies.
export const catalogApi = createApiClient({
  baseUrl: env.API_URL,
  credentials: 'omit',
  // Server-only secret (src/env.ts): lets these reads skip the API's per-IP general rate limit.
  headers: env.INTERNAL_API_SECRET ? { 'x-internal-secret': env.INTERNAL_API_SECRET } : undefined,
  fetch: (url, init) => fetch(url, { ...init, cache: 'force-cache', next: { revalidate: 3600, tags: [CATALOG_TAG] } }),
});
