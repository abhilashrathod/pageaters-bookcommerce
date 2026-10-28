import { createHash } from 'node:crypto';
import { extname } from 'node:path';

import type { AuthorImage } from './authors.ts';
import type { Cover } from './covers.ts';
import type { Doc, Dump } from './sanitise.ts';

// Uploads seed images to Vercel Blob and points the seed's image fields at them. Blob paths carry a hash of the
// content: an unchanged image keeps its URL (and isn't uploaded again); a changed one gets a new URL, so CDN and
// browser caches never serve a stale version.

export const BLOB_PREFIX = 'catalog';

export interface ImageSource {
  // Seed file and document the image belongs to.
  seedName: 'store-books' | 'authors' | 'bundles' | 'collections' | 'categories';
  id: string;
  // Path under seed/data/images.
  file: string;
}

export interface ManifestEntry extends ImageSource {
  pathname: string;
  url: string;
  sha256: string;
  bytes: number;
  contentType: string;
}

interface Artwork {
  kind: 'books' | 'bundles' | 'collections' | 'categories';
  id: string;
  file: string;
}

const ARTWORK_SEED = { books: 'store-books', bundles: 'bundles', collections: 'collections', categories: 'categories' } as const;

// One image per item: the Open Library cover or author image when there is one, else the generated artwork.
export function imageSources(covers: readonly Cover[], authorImages: readonly AuthorImage[], artwork: readonly Artwork[]): ImageSource[] {
  return [
    ...covers.map((c) => ({ seedName: 'store-books' as const, id: c.bookId, file: `covers/${c.bookId}-${c.coverId}.jpg` })),
    ...authorImages.map((a) => ({ seedName: 'authors' as const, id: a.authorId, file: `authors/${a.file}` })),
    ...artwork.map((a) => ({ seedName: ARTWORK_SEED[a.kind], id: a.id, file: `artwork/${a.file}` })),
  ];
}

export const CONTENT_TYPES: Readonly<Record<string, string>> = { '.jpg': 'image/jpeg', '.png': 'image/png' };

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// "covers/BK-1-123.jpg" + hash → "catalog/covers/BK-1-123-<12 hex>.jpg".
export function blobPathname(file: string, hash: string): string {
  const ext = extname(file);
  return `${BLOB_PREFIX}/${file.slice(0, -ext.length)}-${hash.slice(0, 12)}${ext}`;
}

// Seed field holding each document's ID and image URL.
export const IMAGE_FIELDS = {
  'store-books': { id: 'bookId', image: 'poster' },
  authors: { id: 'authorId', image: 'avatar' },
  bundles: { id: 'bundleId', image: 'poster' },
  collections: { id: 'collectionId', image: 'poster' },
  categories: { id: 'categoryId', image: 'thumbnail' },
} as const;

// Points every document's image field at its Blob URL. Every document must have exactly one image: a missing one
// is an error, not a silently broken page. Legacy extra book `images` (old file names with no files) are cleared,
// and a category's SEO image is its thumbnail.
export function applyImages(data: Dump, entries: readonly ManifestEntry[]): Dump {
  const out: Dump = {};
  const missing: string[] = [];
  for (const [seedName, field] of Object.entries(IMAGE_FIELDS) as [
    keyof typeof IMAGE_FIELDS,
    (typeof IMAGE_FIELDS)[keyof typeof IMAGE_FIELDS],
  ][]) {
    const urls = new Map(entries.filter((e) => e.seedName === seedName).map((e) => [e.id, e.url]));
    out[seedName] = (data[seedName] ?? []).map((doc: Doc) => {
      const url = urls.get(String(doc[field.id]));
      if (!url) missing.push(`${seedName} ${String(doc[field.id])}`);
      const next: Doc = { ...doc, [field.image]: url ?? '' };
      if (seedName === 'store-books') next.images = [];
      if (seedName === 'categories' && typeof doc.meta === 'object' && doc.meta !== null) next.meta = { ...doc.meta, imageUrl: url ?? '' };
      return next;
    });
  }
  if (missing.length > 0) throw new Error(`no image for ${missing.length} document(s): ${missing.slice(0, 5).join(', ')}…`);
  return out;
}
