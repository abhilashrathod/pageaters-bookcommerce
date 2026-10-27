// Network and file plumbing shared by the Open Library image scripts (covers, author photos).
import { readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const headers = { 'User-Agent': 'PageatersPortfolioSeed/1.0 (+https://github.com/abhilashrathod/pageaters-bookcommerce)' };
// Images smaller than this are Open Library placeholders or broken files.
export const MIN_IMAGE_BYTES = 2000;
// Open Library has brief 5xx/429 hiccups; one of them must not abort a long run.
const RETRY_DELAYS_MS = [2000, 5000, 15000];

export async function fetchWithRetry(url: string): Promise<Response> {
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

export async function getJson(url: string): Promise<unknown> {
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Open Library: HTTP ${res.status} for ${url}`);
  return res.json();
}

// Runs calls one at a time, a second apart, to stay polite to Open Library's API.
export function throttled<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  let queue = Promise.resolve();
  return (...args) => {
    const result = queue.then(() => fn(...args));
    queue = result.then(
      () => sleep(1000),
      () => sleep(1000),
    );
    return result;
  };
}

// IDs from the sanitised seed (checked by its scan) become file names; checked again here.
export function safeName(id: string, suffix: string): string {
  if (!/^[A-Za-z]+-\d+$/.test(id)) throw new Error(`unexpected id shape: ${id}`);
  return `${id}${suffix}`;
}

export const isImage = (file: string) =>
  stat(file).then(
    (info) => info.size >= MIN_IMAGE_BYTES,
    () => false,
  );

// Keeps a complete file already on disk, else downloads it.
export async function saveImage(file: string, url: string): Promise<'kept' | 'downloaded' | 'failed'> {
  if (await isImage(file)) return 'kept';
  const res = await fetchWithRetry(url);
  const body = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/') || body.length < MIN_IMAGE_BYTES) return 'failed';
  await writeAtomic(file, body);
  return 'downloaded';
}

// Writes through a `.part` file, so an interrupted run never leaves a truncated file under the final name.
export async function writeAtomic(file: string, data: string | Buffer): Promise<void> {
  await writeFile(`${file}.part`, data);
  await rename(`${file}.part`, file);
}

// Removes files in `dir` that are neither referenced nor protected (e.g. items whose lookup failed this run).
// Deletes nothing when the downloaded count fell sharply: an outage answering with empty results must not wipe
// images already on disk. Returns the removed names, or undefined when it held back.
export async function sweep(
  dir: string,
  referenced: ReadonlySet<string>,
  protectedPrefixes: readonly string[],
  counts: { previous: number; current: number },
): Promise<string[] | undefined> {
  if (counts.current < counts.previous * 0.8) return undefined;
  const stale = (await readdir(dir)).filter((file) => !referenced.has(file) && !protectedPrefixes.some((p) => file.startsWith(p)));
  for (const file of stale) await rm(join(dir, file));
  return stale;
}

export const tally = (values: string[]) =>
  JSON.stringify(Object.fromEntries([...new Set(values)].map((v) => [v, values.filter((x) => x === v).length])));
