// Downloads Open Library covers for seed/data/store-books.json into seed/data/images/covers/<bookId>-<coverId>.jpg
// and writes seed/data/covers.json (downloaded covers) and seed/data/cover-misses.json. Files already on disk are
// kept, so reruns only fetch what changed; files no longer referenced are removed.
// Usage: pnpm --filter @pageaters/seed covers
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
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
import type { Doc } from './sanitise.ts';

const dataDir = resolve(import.meta.dirname, '../data');
const coverDir = join(dataDir, 'images/covers');
const headers = { 'User-Agent': 'PageatersPortfolioSeed/1.0 (+https://github.com/abhilashrathod/pageaters-bookcommerce)' };
// Covers smaller than this are Open Library placeholders or broken files.
const MIN_COVER_BYTES = 2000;

const books = JSON.parse(await readFile(join(dataDir, 'store-books.json'), 'utf8')) as Doc[];

// Open Library has brief 5xx/429 hiccups; one of them must not abort a 10-minute run.
const RETRY_DELAYS_MS = [2000, 5000, 15000];

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt];
    try {
      const res = await fetch(url, { headers });
      if ((res.status < 500 && res.status !== 429) || delay === undefined) return res;
    } catch (error) {
      if (delay === undefined) throw error;
    }
    await sleep(delay);
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Open Library: HTTP ${res.status} for ${url}`);
  return res.json();
}

const editions = new Map<string, Candidate>();
for (const batch of chunk(lookupIsbns(books), 50)) {
  for (const [isbn, edition] of parseBooksResponse(await getJson(booksApiUrl(batch)))) editions.set(isbn, edition);
  await sleep(1000);
}

// Searches run one at a time, a second apart, to stay polite to Open Library.
let searchQueue = Promise.resolve();
function searchWork(isbn: string): Promise<Candidate | undefined> {
  const result = searchQueue.then(async () => parseSearchResponse(await getJson(searchUrl(isbn))));
  searchQueue = result.then(
    () => sleep(1000),
    () => sleep(1000),
  );
  return result;
}

// bookIds are checked by the sanitise scan; checked again here because they become file names.
function fileName(book: Doc, coverId: number): string {
  const bookId = String(book.bookId);
  if (!/^[A-Za-z]+-\d+$/.test(bookId)) throw new Error(`unexpected bookId shape: ${bookId}`);
  return `${bookId}-${coverId}.jpg`;
}
// A file on disk counts only if it is a complete cover (an interrupted write never reaches the final name anyway).
const isCover = (file: string) =>
  stat(file).then(
    (info) => info.size >= MIN_COVER_BYTES,
    () => false,
  );
const counts = { downloaded: 0, kept: 0 };

async function download(book: Doc, coverId: number): Promise<boolean> {
  const file = join(coverDir, fileName(book, coverId));
  if (await isCover(file)) {
    counts.kept++;
    return true;
  }
  const res = await fetchWithRetry(coverUrl(coverId));
  const body = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/') || body.length < MIN_COVER_BYTES) return false;
  await writeFile(`${file}.part`, body);
  await rename(`${file}.part`, file);
  counts.downloaded++;
  return true;
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

// Files of books whose lookup failed are kept; so is everything when the cover count drops sharply (an Open Library
// outage answering with empty results must not wipe the covers already downloaded).
const previous = await readFile(join(dataDir, 'covers.json'), 'utf8').then(
  (text) => (JSON.parse(text) as Cover[]).length,
  () => 0,
);
const failed = misses.filter((m) => m.reason === 'lookup-failed').map((m) => `${m.bookId}-`);
const referenced = new Set(covers.map((cover) => `${cover.bookId}-${cover.coverId}.jpg`));
const sharpDrop = covers.length < previous * 0.8;
const stale = sharpDrop
  ? []
  : (await readdir(coverDir)).filter((file) => !referenced.has(file) && !failed.some((prefix) => file.startsWith(prefix)));
for (const file of stale) await rm(join(coverDir, file));

if (sharpDrop) {
  process.stderr.write(
    `Covers dropped from ${previous} to ${covers.length}: nothing deleted or rewritten. Check Open Library and rerun.\n`,
  );
  process.exitCode = 1;
} else {
  const byBookId = (a: { bookId: string }, b: { bookId: string }) => a.bookId.localeCompare(b.bookId);
  await writeFile(join(dataDir, 'covers.json'), `${JSON.stringify(covers.sort(byBookId), null, 2)}\n`);
  await writeFile(join(dataDir, 'cover-misses.json'), `${JSON.stringify(misses.sort(byBookId), null, 2)}\n`);
}

const tally = (values: string[]) =>
  JSON.stringify(Object.fromEntries([...new Set(values)].map((v) => [v, values.filter((x) => x === v).length])));
process.stdout.write(
  [
    `Covers: ${covers.length} of ${books.length} books ${tally(covers.map((c) => c.source))} — ${counts.downloaded} downloaded, ${counts.kept} kept, ${stale.length} stale removed`,
    `Misses: ${misses.length} ${tally(misses.map((m) => m.reason))}`,
    ...misses
      .filter((m) => m.reason === 'title-mismatch' || m.reason === 'lookup-failed')
      .map((m) => `  ${m.reason}  ${m.bookId}  "${m.title}"  vs Open Library ${JSON.stringify(m.openLibraryTitles)}`),
  ].join('\n') + '\n',
);
