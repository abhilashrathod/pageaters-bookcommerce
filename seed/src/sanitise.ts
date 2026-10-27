import { authors, bundles, categories, productSets, specs, storeBooks, type CollectionSpec } from './collections.ts';
import { generateStock } from './stock.ts';

// Documents stay in MongoDB Extended JSON (`{ $oid }`, `{ $date }`) as exported, so the loader keeps types.
export type Doc = Record<string, unknown>;
export type Dump = Record<string, Doc[]>;

export interface Report {
  collections: { name: string; read: number; written: number }[];
  prunedRefs: number;
  // Fields found in the dump that are neither allowlisted nor known drops. Review before adding any.
  unknownFields: string[];
}

const KNOWN_DROPS = new Set(['wholeSalePriceHistory', 'inventory', '__v']);

function idOf(value: unknown): string | undefined {
  if (typeof value === 'object' && value !== null && '$oid' in value && typeof value.$oid === 'string') return value.$oid;
  return undefined;
}

function requireId(doc: Doc, spec: CollectionSpec): string {
  const id = idOf(doc._id);
  if (!id) throw new Error(`${spec.dumpName}: document without an ObjectId _id`);
  return id;
}

function pickFields(source: Doc, allowed: readonly string[], path: string, unknown: Set<string>): Doc {
  const out: Doc = {};
  for (const field of allowed) if (field in source) out[field] = source[field];
  for (const field of Object.keys(source)) {
    if (!allowed.includes(field) && !KNOWN_DROPS.has(field)) unknown.add(`${path}.${field}`);
  }
  return out;
}

function pick(doc: Doc, spec: CollectionSpec, unknown: Set<string>): Doc {
  const out = pickFields(doc, spec.fields, spec.dumpName, unknown);
  for (const [field, allowed] of Object.entries(spec.nested ?? {})) {
    const value = out[field];
    const path = `${spec.dumpName}.${field}`;
    if (Array.isArray(value)) out[field] = (value as Doc[]).map((entry) => pickFields(entry, allowed, `${path}[]`, unknown));
    else if (typeof value === 'object' && value !== null) out[field] = pickFields(value as Doc, allowed, path, unknown);
  }
  return out;
}

export function sanitise(dump: Dump): { data: Dump; report: Report } {
  const live = new Map<CollectionSpec, Doc[]>();
  // Live IDs per collection (`dumpName`), so a reference only survives if its target collection still has it.
  const liveIds = new Map<string, Set<string>>();
  for (const spec of specs) {
    const docs = dump[spec.dumpName];
    if (!docs) throw new Error(`dump is missing pageaters.${spec.dumpName}.json`);
    const kept = spec.softDelete ? docs.filter((doc) => doc.isDeleted !== true) : docs;
    liveIds.set(spec.dumpName, new Set(kept.map((doc) => requireId(doc, spec))));
    live.set(spec, kept);
  }
  const isLive = (target: string, ref: unknown) => liveIds.get(target)?.has(idOf(ref) ?? '') ?? false;

  let prunedRefs = 0;
  const keepLive = (target: string, value: unknown): unknown[] => {
    const list = Array.isArray(value) ? value : [];
    const kept = list.filter((ref) => isLive(target, ref));
    prunedRefs += list.length - kept.length;
    return kept;
  };

  const unknown = new Set<string>();
  const data: Dump = {};
  for (const [spec, docs] of live) {
    data[spec.seedName] = docs.map((source) => {
      const doc = pick(source, spec, unknown);
      for (const [field, target] of Object.entries(spec.refs)) doc[field] = keepLive(target, doc[field]);
      // A kept document is live: a stray deletion date (an old admin mistake) is cleared.
      if (spec.softDelete) doc.deletedAt = '';
      return doc;
    });
  }

  for (const set of data[productSets.seedName] ?? []) {
    const products = Array.isArray(set.products) ? (set.products as Doc[]) : [];
    const kept = products.filter((entry) => isLive(storeBooks.dumpName, entry.product));
    prunedRefs += products.length - kept.length;
    set.products = kept;
  }

  const bundledIds = new Set(
    (data[bundles.seedName] ?? []).flatMap((bundle) => (bundle.bundledBooks as unknown[]).map((ref) => idOf(ref))),
  );
  const books = data[storeBooks.seedName] ?? [];
  for (const book of books) {
    if (!isLive(authors.dumpName, book.author)) throw new Error(`store book ${String(book.bookId)} has no live author`);
    if (book.language === 'EN') book.language = 'English';
    const id = idOf(book._id) ?? '';
    book.inventory = generateStock(id, book.availability, bundledIds.has(id));
  }

  for (const category of data[categories.seedName] ?? []) {
    const id = idOf(category._id);
    category.numberOfBooks = books.filter((book) => (book.categories as unknown[]).some((ref) => idOf(ref) === id)).length;
    // Canonical URLs pointed at the old store; the storefront builds its own.
    if (typeof category.meta === 'object' && category.meta !== null) category.meta = { ...category.meta, url: '' };
  }

  return {
    data,
    report: {
      collections: specs.map((spec) => ({
        name: spec.seedName,
        read: dump[spec.dumpName]?.length ?? 0,
        written: data[spec.seedName]?.length ?? 0,
      })),
      prunedRefs,
      unknownFields: [...unknown].sort(),
    },
  };
}
