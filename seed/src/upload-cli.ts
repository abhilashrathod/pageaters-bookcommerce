// Uploads the seed images (covers, author images, artwork) to Vercel Blob, writes seed/data/image-manifest.json and
// points the image fields in seed/data/*.json at the Blob URLs. Unchanged images are not uploaded again.
// Needs BLOB_READ_WRITE_TOKEN (read from apps/api/.env). Run after sanitise, covers, authors and artwork; rerun
// after any of them (sanitise rewrites the seed files without URLs).
// Usage: pnpm --filter @pageaters/seed upload
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { list, put } from '@vercel/blob';

import type { AuthorImage } from './authors.ts';
import { chunk, type Cover } from './covers.ts';
import { tally, writeAtomic } from './openlibrary.ts';
import type { Doc, Dump } from './sanitise.ts';
import {
  applyImages,
  BLOB_PREFIX,
  blobPathname,
  CONTENT_TYPES,
  imageSources,
  sha256,
  type ImageSource,
  type ManifestEntry,
} from './upload.ts';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set (add it to apps/api/.env)');

const dataDir = resolve(import.meta.dirname, '../data');
const read = async <T>(name: string) => JSON.parse(await readFile(join(dataDir, name), 'utf8')) as T;
const manifestFile = join(dataDir, 'image-manifest.json');

const sources = imageSources(
  await read<Cover[]>('covers.json'),
  await read<AuthorImage[]>('author-images.json'),
  await read<{ kind: 'books' | 'bundles' | 'collections' | 'categories'; id: string; file: string }[]>('artwork.json'),
);
const previous = new Map((await read<ManifestEntry[]>('image-manifest.json').catch(() => [])).map((entry) => [entry.pathname, entry]));

// What the store really holds: a manifest entry is reused only if its blob still exists there (it may have been
// deleted, or the token may point at another store). A bad token or missing store fails here, before any upload.
const stored = new Set<string>();
let cursor: string | undefined;
do {
  const page = await list({ prefix: `${BLOB_PREFIX}/`, token, ...(cursor ? { cursor } : {}) });
  for (const blob of page.blobs) stored.add(blob.pathname);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

const counts = { uploaded: 0, reused: 0, failed: 0 };

async function upload(source: ImageSource): Promise<ManifestEntry | undefined> {
  const body = await readFile(join(dataDir, 'images', source.file)).catch(() => undefined);
  if (!body) {
    process.stderr.write(`missing image file: ${source.file} (rerun the step that makes it)\n`);
    counts.failed++;
    return undefined;
  }
  const hash = sha256(body);
  const pathname = blobPathname(source.file, hash);
  const contentType = CONTENT_TYPES[extname(source.file)] ?? 'application/octet-stream';
  const known = stored.has(pathname) ? previous.get(pathname) : undefined;
  if (known) {
    counts.reused++;
    return { ...known, ...source };
  }
  for (const delay of [0, 2000, 5000]) {
    await sleep(delay);
    try {
      const blob = await put(pathname, body, {
        access: 'public',
        token,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        // Content-addressed paths never change content, so caches may keep them for a year.
        cacheControlMaxAge: 31_536_000,
      });
      counts.uploaded++;
      return { ...source, pathname, url: blob.url, sha256: hash, bytes: body.length, contentType };
    } catch (error) {
      if (delay === 5000) process.stderr.write(`upload failed: ${pathname}: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    }
  }
  counts.failed++;
  return undefined;
}

const entries: ManifestEntry[] = [];
for (const batch of chunk(sources, 4)) {
  for (const entry of await Promise.all(batch.map(upload))) if (entry) entries.push(entry);
}

// Successful uploads are recorded even when others failed, so a rerun only retries the failures.
const byPath = (a: ManifestEntry, b: ManifestEntry) => a.pathname.localeCompare(b.pathname);
await writeAtomic(manifestFile, `${JSON.stringify([...entries].sort(byPath), null, 2)}\n`);

if (counts.failed > 0) {
  process.stderr.write(`${counts.failed} upload(s) failed: seed files left unchanged. Rerun to retry.\n`);
  process.exitCode = 1;
} else {
  const names = ['store-books', 'authors', 'bundles', 'collections', 'categories'] as const;
  const data: Dump = {};
  for (const name of names) data[name] = await read<Doc[]>(`${name}.json`);
  const linked = applyImages(data, entries);
  for (const name of names) await writeAtomic(join(dataDir, `${name}.json`), `${JSON.stringify(linked[name], null, 2)}\n`);

  // Blobs under the prefix that no image uses any more (older versions). Reported only; never deleted here.
  const used = new Set(entries.map((entry) => entry.pathname));
  const orphans = [...stored].filter((pathname) => !used.has(pathname)).length;

  const mb = (entries.reduce((total, entry) => total + entry.bytes, 0) / 1_048_576).toFixed(1);
  process.stdout.write(
    [
      `Images: ${entries.length} (${mb} MB) ${tally(entries.map((e) => e.seedName))}`,
      `Uploaded ${counts.uploaded}, unchanged ${counts.reused}; seed image fields now point at Vercel Blob`,
      `Unused blobs under ${BLOB_PREFIX}/: ${orphans}`,
    ].join('\n') + '\n',
  );
}
