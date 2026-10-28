import type { AnyBulkWriteOperation, ObjectId } from 'mongodb';

import { IMAGE_FIELDS } from './upload.ts';
import type { Dump } from './sanitise.ts';

// Loads the seed into the API database. Safe to rerun: by default it only inserts documents that are missing, so
// edits made since (e.g. by the super-admin) are kept and nothing is deleted. `sync` makes the catalog match the
// seed exactly (replace + remove extras) for a deliberate reset. Accounts always take their credentials from .env;
// the demo shopper's address, cart and favourites are only created when missing.

export const TARGET_DB = 'pageaters_api';

// Seed file → collection, as the API's Mongoose models name them.
export const CATALOG = {
  'store-books': 'storebooks',
  authors: 'authors',
  bundles: 'bundles',
  categories: 'categories',
  collections: 'collections',
  'product-sets': 'product_sets',
} as const;

const BLOB_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//;

// The seed must have been through `upload`: a `sanitise` rerun without it puts the legacy file names back.
export function assertBlobImages(data: Dump): void {
  const bad: string[] = [];
  for (const [seedName, field] of Object.entries(IMAGE_FIELDS)) {
    for (const doc of data[seedName] ?? []) {
      if (!BLOB_HOST.test(String(doc[field.image]))) bad.push(`${seedName} ${String(doc[field.id])}`);
    }
  }
  if (bad.length > 0) throw new Error(`${bad.length} image field(s) are not Vercel Blob URLs (run upload): ${bad.slice(0, 3).join(', ')}…`);
}

// A document as the driver sees it after Extended JSON is decoded (ObjectId, Date…).
export type Row = { _id: ObjectId } & Record<string, unknown>;
type Op = AnyBulkWriteOperation<Row>;

export function assertTargetDb(name: string): void {
  if (name !== TARGET_DB) throw new Error(`MONGODB_URI points at database "${name}", expected "${TARGET_DB}"`);
}

// Documents are deserialised from Extended JSON ({ $oid }, { $date }) by the caller.
export function catalogOps(docs: readonly Row[], sync: boolean): Op[] {
  return docs.map((doc) =>
    sync
      ? { replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }
      : { updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true } },
  );
}

const CREDENTIALS = [
  'email',
  'salt',
  'password',
  'lastPasswordSetAt',
  'role',
  'status',
  'emailVerified',
  'isDeleted',
  'updatedAt',
] as const;

// Credentials and role follow .env on every run; the rest (name, phone, timestamps) is set only on insert.
export function userOps(users: readonly Row[]): Op[] {
  return users.map((user) => {
    const set: Record<string, unknown> = {};
    const insert: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(user)) {
      if (key === '_id') continue;
      if ((CREDENTIALS as readonly string[]).includes(key)) set[key] = value;
      else insert[key] = value;
    }
    return { updateOne: { filter: { _id: user._id }, update: { $set: set, $setOnInsert: insert }, upsert: true } };
  });
}

export function insertMissingOps(docs: readonly Row[]): Op[] {
  return docs.map((doc) => ({ updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true } }));
}

export interface LoadArgs {
  dryRun: boolean;
  sync: boolean;
}

// Unknown options are refused: a typo like `--dryrun` must not turn a preview into a real write.
export function parseArgs(argv: readonly string[]): LoadArgs {
  const unknown = argv.filter((arg) => arg !== '--' && arg !== '--dry-run' && arg !== '--sync');
  if (unknown.length > 0) throw new Error(`unknown option(s): ${unknown.join(' ')} (use --dry-run and/or --sync)`);
  return { dryRun: argv.includes('--dry-run'), sync: argv.includes('--sync') };
}

// Driver errors can quote the connection string (with its password) or a duplicate email; neither reaches the log.
export function redact(message: string): string {
  return message.replace(/mongodb(\+srv)?:\/\/\S+/gi, '<connection string>').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>');
}
