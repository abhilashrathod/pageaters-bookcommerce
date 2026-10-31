import { createApiClient } from '@pageaters/api-client';
import type { Endpoint } from 'payload';

import { isCommerceKind } from '../commerce-kinds.ts';
import type { CommerceKind, CommerceOption } from '../commerce-kinds.ts';

// GET /api/commerce/:kind?q= — the options of a commerce picker, read from the API on the server (no CORS, the API's
// URL stays server-side). Signed-in CMS users only. Small catalogs (at most a few pages of 50) are listed and filtered
// here by title; books (hundreds) go through the API's prefix search.

const MAX_PAGES = 5;
const MAX_OPTIONS = 20;

type Titled = { _id: string; title: string };
type Page = { docs: Titled[]; hasNextPage: boolean };

const allPages = async (fetchPage: (page: number) => Promise<Page>): Promise<Titled[]> => {
  const docs: Titled[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await fetchPage(page);
    docs.push(...result.docs);
    if (!result.hasNextPage) break;
  }
  return docs;
};

const loadOptions = async (apiUrl: string, kind: CommerceKind, q: string): Promise<CommerceOption[]> => {
  const api = createApiClient({ baseUrl: apiUrl });
  const paging = (page: number) => ({ page, limit: 50 });
  let docs: Titled[];
  switch (kind) {
    case 'books':
      docs = q.length >= 2 ? await api.books.search({ q }) : [];
      break;
    case 'book-boxes':
      docs = await allPages((page) => api.books.list({ ...paging(page), type: 'book_box' }));
      break;
    case 'product-sets':
      docs = await allPages((page) => api.productSets.list(paging(page)));
      break;
    case 'collections':
      docs = await allPages((page) => api.collections.list(paging(page)));
      break;
    case 'categories':
      docs = await allPages((page) => api.categories.list(paging(page)));
      break;
    case 'bundles':
      docs = await allPages((page) => api.bundles.list(paging(page)));
      break;
  }
  const needle = q.toLowerCase();
  return docs
    .filter((doc) => kind === 'books' || doc.title.toLowerCase().includes(needle))
    .slice(0, MAX_OPTIONS)
    .map((doc) => ({ id: String(doc._id), label: doc.title }));
};

export const commerceEndpoint = (apiUrl: string): Endpoint => ({
  path: '/commerce/:kind',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return Response.json({ message: 'Sign in to the CMS first' }, { status: 401 });
    const kind = req.routeParams?.kind;
    if (!isCommerceKind(kind)) return Response.json({ message: 'Unknown kind' }, { status: 404 });
    const q = (req.searchParams.get('q') ?? '').trim().slice(0, 60);
    try {
      return Response.json({ options: await loadOptions(apiUrl, kind, q) });
    } catch (error) {
      req.payload.logger.error({ err: error, kind }, 'Commerce picker: the API call failed');
      return Response.json({ message: 'The store API is unavailable' }, { status: 502 });
    }
  },
});
