import { isValidIsbn } from './isbn.ts';
import type { Doc } from './sanitise.ts';

// Book covers from Open Library, always anchored on the book's ISBN:
// 1. Books API: a batch of ISBNs → each edition's cover.
// 2. Search by ISBN: the cover of the whole work, for editions without a usable cover.
// Covers fetched by ID are not rate-limited (lookups by ISBN on covers.openlibrary.org are: 100 per 5 minutes).

export const BOOKS_API = 'https://openlibrary.org/api/books';
export const searchUrl = (isbn: string) => `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,cover_i&limit=1`;
export const coverUrl = (coverId: number) => `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;

export type CoverSource = 'edition' | 'work';

export interface Candidate {
  source: CoverSource;
  title: string;
  coverId?: number;
}

export interface Cover {
  bookId: string;
  isbn: string;
  title: string;
  source: CoverSource;
  coverId: number;
  openLibraryTitle: string;
}

export type MissReason =
  | 'no-isbn'
  | 'invalid-isbn'
  | 'not-in-open-library'
  | 'no-cover'
  | 'title-mismatch'
  | 'download-failed'
  // Open Library kept failing after retries; the book's previous cover file (if any) is kept.
  | 'lookup-failed';

export interface Miss {
  bookId: string;
  isbn: string;
  title: string;
  reason: MissReason;
  // Open Library's titles for the book, to review title mismatches.
  openLibraryTitles: string[];
}

// Open Library titles that differ from ours but were checked and show the right cover (PLAN Phase 2 step 3). Each
// acceptance holds only for the exact Open Library title that was reviewed.
export const acceptedTitleMismatches: Readonly<Record<string, { openLibraryTitle: string; reason: string }>> = {
  'BK-1876957025': { openLibraryTitle: 'O Alquimista', reason: 'The Alchemist under its original title; cover is the English edition' },
  'BK-3171207293': {
    openLibraryTitle: 'And The Mountain Echoed  [Paperback] [Jan 01, 2001] KHALED HOSSEINI',
    reason: 'listing title carries format and author',
  },
  'BK-3551788869': { openLibraryTitle: 'Heartstopper: Volume Two', reason: 'our "Vol #2"' },
  'BK-8469964116': { openLibraryTitle: 'Atalanta', reason: 'our title has a typo ("Atlanta")' },
  'BK-8774268760': { openLibraryTitle: 'Fourth Wing - The Empyrean #1', reason: 'series name in the title' },
  'BK-9343010551': { openLibraryTitle: 'Bond [Paperback]', reason: 'Forever and a Day, an Anthony Horowitz Bond novel' },
  'BK-9676908760': {
    openLibraryTitle: 'THE CITY OF BRASS [Paperback] S. A. Chakraborty',
    reason: 'listing title carries format and author',
  },
};

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function booksApiUrl(isbns: readonly string[]): string {
  const keys = isbns.map((isbn) => `ISBN:${isbn}`).join(',');
  return `${BOOKS_API}?bibkeys=${keys}&format=json&jscmd=data`;
}

// `{ "ISBN:978…": { title, cover: { large: ".../b/id/123-L.jpg" } } }` → ISBN → edition candidate.
export function parseBooksResponse(json: unknown): Map<string, Candidate> {
  const editions = new Map<string, Candidate>();
  if (typeof json !== 'object' || json === null) return editions;
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (!key.startsWith('ISBN:') || typeof value !== 'object' || value === null) continue;
    const entry = value as { title?: unknown; cover?: { large?: unknown } };
    const id = typeof entry.cover?.large === 'string' ? /\/b\/id\/(\d+)-/.exec(entry.cover.large)?.[1] : undefined;
    const title = typeof entry.title === 'string' ? entry.title : '';
    editions.set(key.slice(5), { source: 'edition', title, ...(id ? { coverId: Number(id) } : {}) });
  }
  return editions;
}

// `{ docs: [{ title, cover_i }] }` → work candidate, if Open Library found the ISBN.
export function parseSearchResponse(json: unknown): Candidate | undefined {
  const doc = (json as { docs?: { title?: unknown; cover_i?: unknown }[] } | null)?.docs?.[0];
  if (!doc) return undefined;
  const title = typeof doc.title === 'string' ? doc.title : '';
  return { source: 'work', title, ...(typeof doc.cover_i === 'number' ? { coverId: doc.cover_i } : {}) };
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'in', 'on', 'for', 'with', 'book', 'novel']);

function words(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z\d\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word && !STOP_WORDS.has(word)),
  );
}

// Titles match when most words of the shorter one appear in the other (subtitles and editions differ).
export function titlesMatch(ours: string, theirs: string): boolean {
  const a = words(ours);
  const b = words(theirs);
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size === 0) return false;
  const shared = [...small].filter((word) => large.has(word)).length;
  return shared / small.size >= 0.6;
}

export function lookupIsbns(books: readonly Doc[]): string[] {
  return books.map((book) => String(book.ISBN)).filter(isValidIsbn);
}

// Candidates with a cover whose title matches ours (or was accepted after review), best first.
export function usable(book: Doc, candidates: readonly (Candidate | undefined)[]): (Candidate & { coverId: number })[] {
  const accepted = acceptedTitleMismatches[String(book.bookId)]?.openLibraryTitle;
  return candidates.filter(
    (c): c is Candidate & { coverId: number } =>
      c?.coverId !== undefined && (c.title === accepted || titlesMatch(String(book.title), c.title)),
  );
}

// Why a book ends up without a cover, given everything Open Library returned for it.
export function missReason(book: Doc, candidates: readonly (Candidate | undefined)[]): MissReason {
  const isbn = String(book.ISBN);
  if (!isbn) return 'no-isbn';
  if (!isValidIsbn(isbn)) return 'invalid-isbn';
  const known = candidates.filter((c) => c !== undefined);
  if (known.length === 0) return 'not-in-open-library';
  if (known.every((c) => c.coverId === undefined)) return 'no-cover';
  if (usable(book, known).length === 0) return 'title-mismatch';
  return 'download-failed';
}
