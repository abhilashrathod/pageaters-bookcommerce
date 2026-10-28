// Author images for seed/data/authors.json: an Open Library photo when the author is matched with confidence
// (seed/data/images/authors/<authorId>-<photoId>.jpg), else a branded initials avatar (<authorId>.png, rendered with the brand font). Writes
// seed/data/author-images.json. Files already on disk are kept; files no longer referenced are removed.
// Usage: pnpm --filter @pageaters/seed authors   (after sanitise; needs network)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  authorPhotoUrl,
  authorRecordUrl,
  authorSearchUrl,
  initialsAvatar,
  matchByIsbn,
  matchBySearch,
  parseAuthorPhoto,
  parseAuthorSearch,
  parseEditionAuthors,
  sameName,
  type AuthorImage,
  type InitialsReason,
  type OpenLibraryAuthor,
} from './authors.ts';
import { booksApiUrl, chunk } from './covers.ts';
import { isValidIsbn } from './isbn.ts';
import { getJson, safeName, saveImage, sweep, tally, throttled, writeAtomic } from './openlibrary.ts';
import { renderPng } from './render.ts';
import type { Doc } from './sanitise.ts';

const dataDir = resolve(import.meta.dirname, '../data');
const imageDir = join(dataDir, 'images/authors');

const authors = JSON.parse(await readFile(join(dataDir, 'authors.json'), 'utf8')) as Doc[];
const books = JSON.parse(await readFile(join(dataDir, 'store-books.json'), 'utf8')) as Doc[];

const oid = (value: unknown) => (value as { $oid?: string } | undefined)?.$oid ?? '';
const booksByAuthor = new Map<string, Doc[]>();
for (const book of books) booksByAuthor.set(oid(book.author), [...(booksByAuthor.get(oid(book.author)) ?? []), book]);

const editions = new Map<string, OpenLibraryAuthor[]>();
const isbns = [...new Set(books.map((book) => String(book.ISBN)).filter(isValidIsbn))];
for (const batch of chunk(isbns, 50)) {
  for (const [isbn, found] of parseEditionAuthors(await getJson(booksApiUrl(batch)))) editions.set(isbn, found);
  await sleep(1000);
}

const politeJson = throttled(getJson);
const counts = { downloaded: 0, kept: 0, failed: 0 };

async function imageFor(author: Doc): Promise<AuthorImage> {
  const authorId = String(author.authorId);
  const name = String(author.name);
  const own = booksByAuthor.get(oid(author._id)) ?? [];
  const png = safeName(authorId, '.png');
  const initials = async (reason: InitialsReason): Promise<AuthorImage> => {
    await writeAtomic(join(imageDir, png), await renderPng(initialsAvatar(name)));
    return { authorId, name, file: png, kind: 'initials', reason };
  };
  try {
    let match = matchByIsbn(
      name,
      own.map((book) => String(book.ISBN)),
      editions,
    );
    const matchedBy = match ? 'isbn' : 'search';
    // Authors without books can't be confirmed by a search (no titles to compare).
    if (!match && own.length === 0) return await initials('no-match');
    match ??= matchBySearch(
      name,
      own.map((book) => String(book.title)),
      parseAuthorSearch(await politeJson(authorSearchUrl(name))),
    );
    if (!match) return await initials('no-match');
    const photoId = parseAuthorPhoto(await politeJson(authorRecordUrl(match.olid)));
    if (photoId === undefined) return await initials('no-photo');
    const file = safeName(authorId, `-${photoId}.jpg`);
    const result = await saveImage(join(imageDir, file), authorPhotoUrl(photoId));
    counts[result]++;
    if (result === 'failed') return await initials('download-failed');
    return { authorId, name, file, kind: 'photo', matchedBy, olid: match.olid, openLibraryName: match.name, photoId };
  } catch {
    return await initials('lookup-failed');
  }
}

await mkdir(imageDir, { recursive: true });
const images: AuthorImage[] = [];
for (const batch of chunk(authors, 4)) images.push(...(await Promise.all(batch.map(imageFor))));

const photos = images.filter((image) => image.kind === 'photo');
const previous = await readFile(join(dataDir, 'author-images.json'), 'utf8').then(
  (text) => (JSON.parse(text) as AuthorImage[]).filter((image) => image.kind === 'photo').length,
  () => 0,
);
const stale = await sweep(
  imageDir,
  new Set(images.map((image) => image.file)),
  images.filter((image) => image.reason === 'lookup-failed' || image.reason === 'download-failed').map((image) => `${image.authorId}-`),
  { previous, current: photos.length },
);

if (!stale) {
  process.stderr.write(
    `Author photos dropped from ${previous} to ${photos.length}: no images deleted and author-images.json not rewritten. Check Open Library and rerun.\n`,
  );
  process.exitCode = 1;
} else {
  const sorted = images.sort((a, b) => a.authorId.localeCompare(b.authorId));
  await writeFile(join(dataDir, 'author-images.json'), `${JSON.stringify(sorted, null, 2)}\n`);
}

// Photos matched on surname and initial rather than the exact name, to spot-check.
const loose = photos.filter((image) => !sameName(image.name, image.openLibraryName ?? ''));
process.stdout.write(
  [
    `Author photos: ${photos.length} of ${authors.length} ${tally(photos.map((p) => p.matchedBy ?? ''))} — ${counts.downloaded} downloaded, ${counts.kept} kept, ${stale?.length ?? 0} stale removed`,
    `Initials: ${images.length - photos.length} ${tally(images.flatMap((i) => (i.reason ? [i.reason] : [])))}`,
    `Matched on surname + initial, to spot-check: ${loose.length}`,
    ...loose.map((image) => `  ${image.authorId}  "${image.name}"  ≈  "${image.openLibraryName ?? ''}"`),
  ].join('\n') + '\n',
);
