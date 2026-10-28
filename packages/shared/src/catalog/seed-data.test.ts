import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import type { z } from 'zod';

import { authorSchema, bookSchema, bundleSchema, categorySchema, collectionSchema, productSetSchema } from './index.ts';

// Every document the seed pipeline wrote to `seed/data` must parse as the API would send it. The seed is
// generated locally and gitignored, so the test skips where it is absent (CI, fresh clones).
const SEED_DIR = new URL('../../../../seed/data/', import.meta.url);

// Seed files are MongoDB Extended JSON. Over the API's JSON an ObjectId is its hex string and a date its ISO
// string; numbers in canonical form ({ $numberInt } …) become plain numbers.
function toApiJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toApiJson);
  if (typeof value !== 'object' || value === null) return value;
  const record = value as Record<string, unknown>;
  if (typeof record.$oid === 'string') return record.$oid;
  if ('$date' in record) {
    const date = record.$date;
    const millis = typeof date === 'object' && date !== null ? Number((date as Record<string, unknown>).$numberLong) : date;
    return new Date(millis as string | number).toISOString();
  }
  for (const key of ['$numberInt', '$numberLong', '$numberDouble', '$numberDecimal']) {
    if (key in record) return Number(record[key]);
  }
  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, toApiJson(entry)]));
}

const COLLECTIONS: [file: string, schema: z.ZodType][] = [
  ['store-books', bookSchema],
  ['authors', authorSchema],
  ['bundles', bundleSchema],
  ['categories', categorySchema],
  ['collections', collectionSchema],
  ['product-sets', productSetSchema],
];

void describe('seed data', () => {
  for (const [file, schema] of COLLECTIONS) {
    const path = new URL(`${file}.json`, SEED_DIR);
    void it(`every ${file} document parses`, { skip: !existsSync(path) && 'seed/data is absent' }, () => {
      const docs = toApiJson(JSON.parse(readFileSync(path, 'utf8'))) as unknown[];
      assert.ok(docs.length > 0, `${file} is empty`);
      const failures = docs.flatMap((doc, index) => {
        const result = schema.safeParse(doc);
        return result.success ? [] : [`#${index}: ${JSON.stringify(result.error.issues.slice(0, 3))}`];
      });
      assert.deepEqual(failures, [], `${failures.length}/${docs.length} ${file} documents failed`);
    });
  }
});
