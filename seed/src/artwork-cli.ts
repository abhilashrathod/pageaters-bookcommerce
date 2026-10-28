// Generates brand artwork for books without a usable cover (from seed/data/covers.json), bundles, collections and
// categories into seed/data/images/artwork/<kind>/<id>.png (rendered with the brand font), and writes seed/data/artwork.json.
// Usage: pnpm --filter @pageaters/seed artwork   (after sanitise and covers)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { bookArtwork, bundleArtwork, categoryArtwork, collectionArtwork } from './artwork.ts';
import type { Cover } from './covers.ts';
import { safeName, sweep, tally, writeAtomic } from './openlibrary.ts';
import { renderPng } from './render.ts';
import type { Doc } from './sanitise.ts';

const dataDir = resolve(import.meta.dirname, '../data');
const artDir = join(dataDir, 'images/artwork');
const read = async <T>(name: string) => JSON.parse(await readFile(join(dataDir, name), 'utf8')) as T;

const books = await read<Doc[]>('store-books.json');
const authors = await read<Doc[]>('authors.json');
const covers = await read<Cover[]>('covers.json').catch(() => {
  throw new Error('seed/data/covers.json is missing: run `covers` first, so artwork goes only to books without a cover');
});

const oid = (value: unknown) => (value as { $oid?: string } | undefined)?.$oid ?? '';
const authorName = new Map(authors.map((author) => [oid(author._id), String(author.name)]));
const withCover = new Set(covers.map((cover) => cover.bookId));

interface Artwork {
  kind: 'books' | 'bundles' | 'collections' | 'categories';
  id: string;
  file: string;
}

const jobs: (Artwork & { svg: string })[] = [
  ...books
    .filter((book) => !withCover.has(String(book.bookId)))
    .map((book) => ({
      kind: 'books' as const,
      id: String(book.bookId),
      svg: bookArtwork(String(book.bookId), String(book.title), authorName.get(oid(book.author)) ?? ''),
    })),
  ...(await read<Doc[]>('bundles.json')).map((bundle) => ({
    kind: 'bundles' as const,
    id: String(bundle.bundleId),
    svg: bundleArtwork(String(bundle.bundleId), String(bundle.title), (bundle.bundledBooks as unknown[]).length),
  })),
  ...(await read<Doc[]>('collections.json')).map((collection) => ({
    kind: 'collections' as const,
    id: String(collection.collectionId),
    svg: collectionArtwork(String(collection.collectionId), String(collection.title)),
  })),
  ...(await read<Doc[]>('categories.json')).map((category) => ({
    kind: 'categories' as const,
    id: String(category.categoryId),
    svg: categoryArtwork(String(category.title)),
  })),
].map((job) => ({ ...job, file: `${job.kind}/${safeName(job.id, '.png')}` }));

const removed: string[] = [];
for (const kind of ['books', 'bundles', 'collections', 'categories'] as const) {
  const dir = join(artDir, kind);
  await mkdir(dir, { recursive: true });
  const mine = jobs.filter((job) => job.kind === kind);
  for (const job of mine) await writeAtomic(join(artDir, job.file), await renderPng(job.svg));
  // Generated, not downloaded: nothing to protect, so the sweep never holds back.
  const stale = await sweep(dir, new Set(mine.map((job) => job.file.slice(kind.length + 1))), [], { previous: 0, current: 0 });
  removed.push(...(stale ?? []));
}

const manifest: Artwork[] = jobs.map(({ kind, id, file }) => ({ kind, id, file }));
await writeFile(join(dataDir, 'artwork.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Artwork: ${manifest.length} ${tally(manifest.map((a) => a.kind))}, ${removed.length} stale removed\n`);
