import type { MetadataRoute } from 'next';

import { env } from '@/env.ts';
import { catalogApi } from '@/lib/api.ts';
import { cmsFetch } from '@/lib/cms.ts';
import { pageHref } from '@/lib/paths.ts';

// Built at deploy time (services may be down) and refreshed hourly. CMS pages plus the first 50 of each item type.
export const revalidate = 3600;

const LIMIT = { page: 1, limit: 50 };
const ids = <T>(load: () => Promise<{ docs: T[] }>, path: (doc: T) => string) =>
  load().then(
    ({ docs }) => docs.map(path),
    () => [] as string[],
  );

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await cmsFetch<{ docs: { slug: string }[] }>('/pages?where[_status][equals]=published&limit=100&depth=0', ['cms:pages']);
  const paths = await Promise.all([
    ids(
      () => catalogApi.books.list(LIMIT),
      (book) => `/books/${book.bookId}`,
    ),
    ids(
      () => catalogApi.collections.list(LIMIT),
      (collection) => `/collections/${collection.collectionId}`,
    ),
    ids(
      () => catalogApi.categories.list(LIMIT),
      (category) => `/categories/${category.categoryId}`,
    ),
    ids(
      () => catalogApi.authors.list(LIMIT),
      (author) => `/authors/${author.authorId}`,
    ),
    ids(
      () => catalogApi.bundles.list(LIMIT),
      (bundle) => `/bundles/${bundle.bundleId}`,
    ),
  ]);
  return [...new Set([...(pages?.docs ?? []).map((page) => pageHref(page.slug)), '/', '/about', '/book-boxes', ...paths.flat()])].map((path) => ({
    url: `${env.SITE_URL}${path}`,
  }));
}
