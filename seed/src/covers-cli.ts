// Downloads Open Library covers for seed/data/store-books.json into seed/data/images/covers/<bookId>-<coverId>.jpg
// and writes seed/data/covers.json (downloaded covers) and seed/data/cover-misses.json. Files already on disk are
// kept, so reruns only fetch what changed; files no longer referenced are removed.
// Usage: pnpm --filter @pageaters/seed covers
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  booksApiUrl,
  chunk,
  coverUrl,
  lookupIsbns,
  missReason,
  parseBooksResponse,
  parseSearchResponse,
  searchUrl,
  usable,
  type Candidate,
  type Cover,
  type Miss,
  type MissReason,
} from './covers.ts';
import { isValidIsbn } from './isbn.ts';
import { getJson, safeName, saveImage, sweep, tally, throttled } from './openlibrary.ts';
import type { Doc } from './sanitise.ts';

const dataDir = resolve(import.meta.dirname, '../data');
const coverDir = join(dataDir, 'images/covers');

const books = JSON.parse(await readFile(join(dataDir, 'store-books.json'), 'utf8')) as Doc[];

const editions = new Map<string, Candidate>();
for (const batch of chunk(lookupIsbns(books), 50)) {
  for (const [isbn, edition] of parseBooksResponse(await getJson(booksApiUrl(batch)))) editions.set(isbn, edition);
  await sleep(1000);
}

const searchWork = throttled(async (isbn: string) => parseSearchResponse(await getJson(searchUrl(isbn))));

const counts = { downloaded: 0, kept: 0, failed: 0 };
async function download(book: Doc, coverId: number): Promise<boolean> {
  const result = await saveImage(join(coverDir, safeName(String(book.bookId), `-${coverId}.jpg`)), coverUrl(coverId));
  counts[result]++;
  return result !== 'failed';
}

async function coverFor(book: Doc): Promise<Cover | Miss> {
  const bookId = String(book.bookId);
  const isbn = String(book.ISBN);
  const title = String(book.title);
  const candidates: (Candidate | undefined)[] = [editions.get(isbn)];
  const tried = new Set<number>();
  const attempt = async (): Promise<Cover | undefined> => {
    for (const candidate of usable(book, candidates)) {
      const { coverId } = candidate;
      if (tried.has(coverId)) continue;
      tried.add(coverId);
      if (await download(book, coverId))
        return { bookId, isbn, title, source: candidate.source, coverId, openLibraryTitle: candidate.title };
    }
    return undefined;
  };
  const miss = (reason: MissReason): Miss => ({
    bookId,
    isbn,
    title,
    reason,
    openLibraryTitles: candidates.flatMap((c) => (c ? [c.title] : [])),
  });
  if (!isValidIsbn(isbn)) return miss(missReason(book, candidates));
  try {
    const fromEdition = await attempt();
    if (fromEdition) return fromEdition;
    candidates.push(await searchWork(isbn));
    return (await attempt()) ?? miss(missReason(book, candidates));
  } catch {
    return miss('lookup-failed');
  }
}

await mkdir(coverDir, { recursive: true });
const covers: Cover[] = [];
const misses: Miss[] = [];
for (const batch of chunk(books, 4)) {
  for (const result of await Promise.all(batch.map(coverFor))) {
    if ('reason' in result) misses.push(result);
    else covers.push(result);
  }
}

const previous = await readFile(join(dataDir, 'covers.json'), 'utf8').then(
  (text) => (JSON.parse(text) as Cover[]).length,
  () => 0,
);
const stale = await sweep(
  coverDir,
  new Set(covers.map((cover) => `${cover.bookId}-${cover.coverId}.jpg`)),
  misses.filter((m) => m.reason === 'lookup-failed').map((m) => `${m.bookId}-`),
  { previous, current: covers.length },
);

if (!stale) {
  process.stderr.write(
    `Covers dropped from ${previous} to ${covers.length}: nothing deleted or rewritten. Check Open Library and rerun.\n`,
  );
  process.exitCode = 1;
} else {
  const byBookId = (a: { bookId: string }, b: { bookId: string }) => a.bookId.localeCompare(b.bookId);
  await writeFile(join(dataDir, 'covers.json'), `${JSON.stringify(covers.sort(byBookId), null, 2)}\n`);
  await writeFile(join(dataDir, 'cover-misses.json'), `${JSON.stringify(misses.sort(byBookId), null, 2)}\n`);
}

process.stdout.write(
  [
    `Covers: ${covers.length} of ${books.length} books ${tally(covers.map((c) => c.source))} — ${counts.downloaded} downloaded, ${counts.kept} kept, ${stale?.length ?? 0} stale removed`,
    `Misses: ${misses.length} ${tally(misses.map((m) => m.reason))}`,
    ...misses
      .filter((m) => m.reason === 'title-mismatch' || m.reason === 'lookup-failed')
      .map((m) => `  ${m.reason}  ${m.bookId}  "${m.title}"  vs Open Library ${JSON.stringify(m.openLibraryTitles)}`),
  ].join('\n') + '\n',
);
