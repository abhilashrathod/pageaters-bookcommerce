import { titlesMatch } from './covers.ts';

// Author photos from Open Library, matched with confidence:
// 1. ISBN: the authors Open Library lists on the edition of one of the author's own books, if the name agrees.
// 2. Search: an author whose name is exactly ours and whose best-known work is one of our titles for them.
// Anyone else gets a branded initials avatar.

export const authorSearchUrl = (name: string) => `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=10`;
export const authorRecordUrl = (olid: string) => `https://openlibrary.org/authors/${olid}.json`;
export const authorPhotoUrl = (photoId: number) => `https://covers.openlibrary.org/a/id/${photoId}-L.jpg?default=false`;

export interface OpenLibraryAuthor {
  olid: string;
  name: string;
  topWork?: string;
}

export type MatchedBy = 'isbn' | 'search';
// `lookup-failed` and `download-failed` keep the author's previous photo file on disk.
export type InitialsReason = 'no-match' | 'no-photo' | 'lookup-failed' | 'download-failed';

export interface AuthorImage {
  authorId: string;
  name: string;
  file: string;
  kind: 'photo' | 'initials';
  matchedBy?: MatchedBy;
  olid?: string;
  openLibraryName?: string;
  photoId?: number;
  // Why an author got initials instead of a photo.
  reason?: InitialsReason;
}

// Lowercase words without accents or punctuation: "S.A. Chakraborty" → ["s", "a", "chakraborty"].
export function nameWords(name: string): string[] {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\d\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function sameName(a: string, b: string): boolean {
  const x = nameWords(a);
  return x.length > 0 && x.join(' ') === nameWords(b).join(' ');
}

// For a name found on the author's own edition: same surname and same first initial is enough
// ("J.K. Rowling" / "Joanne Rowling"); a co-author, illustrator or translator has a different surname.
export function namesAgree(ours: string, theirs: string): boolean {
  if (sameName(ours, theirs)) return true;
  const a = nameWords(ours);
  const b = nameWords(theirs);
  return a.length > 1 && b.length > 1 && a.at(-1) === b.at(-1) && a[0]?.[0] === b[0]?.[0];
}

const OLID = /\/authors\/(OL\d+A)/;

// Books API `{ "ISBN:…": { authors: [{ url: ".../authors/OL23919A/…", name }] } }` → ISBN → edition authors.
export function parseEditionAuthors(json: unknown): Map<string, OpenLibraryAuthor[]> {
  const out = new Map<string, OpenLibraryAuthor[]>();
  if (typeof json !== 'object' || json === null) return out;
  for (const [key, value] of Object.entries(json as Record<string, { authors?: { url?: unknown; name?: unknown }[] }>)) {
    if (!key.startsWith('ISBN:')) continue;
    const authors = (value.authors ?? []).flatMap((a) => {
      const olid = typeof a.url === 'string' ? OLID.exec(a.url)?.[1] : undefined;
      return olid && typeof a.name === 'string' ? [{ olid, name: a.name }] : [];
    });
    out.set(key.slice(5), authors);
  }
  return out;
}

// `{ docs: [{ key: "OL1926056A", name, top_work }] }` → authors.
export function parseAuthorSearch(json: unknown): OpenLibraryAuthor[] {
  const docs = (json as { docs?: { key?: unknown; name?: unknown; top_work?: unknown }[] } | null)?.docs ?? [];
  return docs.flatMap((d) =>
    typeof d.key === 'string' && /^OL\d+A$/.test(d.key) && typeof d.name === 'string'
      ? [{ olid: d.key, name: d.name, ...(typeof d.top_work === 'string' ? { topWork: d.top_work } : {}) }]
      : [],
  );
}

// Author record `{ photos: [5543033, -1] }` → first real photo ID.
export function parseAuthorPhoto(json: unknown): number | undefined {
  const photos = (json as { photos?: unknown } | null)?.photos;
  return Array.isArray(photos) ? photos.find((id): id is number => typeof id === 'number' && id > 0) : undefined;
}

// An exact name on any of the author's editions wins over a looser surname + initial agreement (a co-author or
// relative can share both).
export function matchByIsbn(name: string, isbns: readonly string[], editions: ReadonlyMap<string, OpenLibraryAuthor[]>) {
  const listed = isbns.flatMap((isbn) => editions.get(isbn) ?? []);
  return listed.find((a) => sameName(name, a.name)) ?? listed.find((a) => namesAgree(name, a.name));
}

export function matchBySearch(name: string, titles: readonly string[], found: readonly OpenLibraryAuthor[]) {
  return found.find((a) => sameName(name, a.name) && a.topWork !== undefined && titles.some((t) => titlesMatch(t, a.topWork ?? '')));
}

export function initials(name: string): string {
  const words = name.split(/[\s.]+/).filter((w) => /\p{L}/u.test(w));
  const first = words[0]?.match(/\p{L}/u)?.[0] ?? '?';
  const last = words.length > 1 ? (words.at(-1)?.match(/\p{L}/u)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

const escapeXml = (text: string) => text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Square avatar in the brand colours (theme accent and primary); the storefront crops it to a circle.
export function initialsAvatar(name: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${escapeXml(name)}">
  <rect width="400" height="400" fill="#ff5f25"/>
  <circle cx="200" cy="200" r="150" fill="none" stroke="#222222" stroke-opacity="0.18" stroke-width="12"/>
  <text x="200" y="200" dy="0.35em" text-anchor="middle" fill="#ffffff" font-family="Metropolis, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="150" font-weight="700">${escapeXml(initials(name))}</text>
</svg>
`;
}
