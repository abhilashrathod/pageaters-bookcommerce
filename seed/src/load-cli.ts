// Loads the seed into the API database (MONGODB_URI in apps/api/.env, database pageaters_api). Safe to rerun; see
// load.ts for what a rerun changes. Run after upload.
// Usage: pnpm seed [--dry-run] [--sync]   (from the repo root)
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { BSON, MongoClient, type AnyBulkWriteOperation, type ObjectId } from 'mongodb';

import { buildAccounts } from './accounts.ts';
import { assertBlobImages, assertTargetDb, CATALOG, catalogOps, insertMissingOps, parseArgs, redact, userOps, type Row } from './load.ts';
import type { Doc, Dump } from './sanitise.ts';

async function main(): Promise<void> {
  const { dryRun, sync } = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (apps/api/.env)');

  const dataDir = resolve(import.meta.dirname, '../data');
  const data: Dump = {};
  for (const seedName of Object.keys(CATALOG)) {
    data[seedName] = JSON.parse(await readFile(join(dataDir, `${seedName}.json`), 'utf8')) as Doc[];
  }
  assertBlobImages(data);
  const accounts = buildAccounts(process.env);

  // Extended JSON ({ $oid }, { $date }) → ObjectId / Date.
  const toBson = (docs: readonly Doc[]) => docs.map((doc) => BSON.EJSON.deserialize(doc, { relaxed: false }) as Row);

  const plan: Step[] = [
    ...Object.entries(CATALOG).map(([seedName, collection]) => {
      const docs = toBson(data[seedName] ?? []);
      return { collection, ops: catalogOps(docs, sync), ids: docs.map((doc) => doc._id), removeExtras: sync };
    }),
    ...(
      [
        ['users', userOps, accounts.users],
        ['addresses', insertMissingOps, accounts.addresses],
        ['carts', insertMissingOps, accounts.carts],
        ['favorites', insertMissingOps, accounts.favorites],
      ] as const
    ).map(([collection, ops, docs]) => {
      const rows = toBson(docs);
      return { collection, ops: ops(rows), ids: rows.map((row) => row._id), removeExtras: false };
    }),
  ];

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  try {
    await client.connect();
    const db = client.db();
    assertTargetDb(db.databaseName);
    process.stdout.write(
      `${dryRun ? 'Dry run against' : 'Loading into'} "${db.databaseName}"${sync ? ' (sync: catalog replaced, extras removed)' : ''}\n`,
    );
    for (const { collection: name, ops, ids, removeExtras } of plan) {
      const collection = db.collection<Row>(name);
      const before = await collection.countDocuments();
      if (dryRun) {
        const missing = ids.length - (await collection.countDocuments({ _id: { $in: ids } }));
        const extras = removeExtras ? await collection.countDocuments({ _id: { $nin: ids } }) : 0;
        process.stdout.write(
          `  ${name.padEnd(13)} ${String(before).padStart(4)} now: would insert ${missing}${removeExtras ? `, replace ${ids.length - missing}, remove ${extras}` : ''}\n`,
        );
        continue;
      }
      const result = await collection.bulkWrite(ops, { ordered: false });
      const removed = removeExtras ? (await collection.deleteMany({ _id: { $nin: ids } })).deletedCount : 0;
      const after = await collection.countDocuments();
      process.stdout.write(
        `  ${name.padEnd(13)} ${String(before).padStart(4)} → ${String(after).padStart(4)}  (inserted ${result.upsertedCount}, updated ${result.modifiedCount}${removeExtras ? `, removed ${removed}` : ''})\n`,
      );
    }
  } finally {
    await client.close();
  }
}

interface Step {
  collection: string;
  ops: AnyBulkWriteOperation<Row>[];
  ids: ObjectId[];
  // Catalog collections in sync mode: documents not in the seed are removed.
  removeExtras: boolean;
}

main().catch((error: unknown) => {
  process.stderr.write(`pnpm seed failed: ${redact(error instanceof Error ? `${error.name}: ${error.message}` : String(error))}\n`);
  process.exitCode = 1;
});
