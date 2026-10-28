import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ObjectId } from 'mongodb';

import { assertBlobImages, assertTargetDb, catalogOps, insertMissingOps, parseArgs, redact, userOps } from './load.ts';

// node:test's describe/it return promises the runner tracks itself.

const blob = (name: string) => `https://abc123.public.blob.vercel-storage.com/catalog/${name}`;
const data = () => ({
  'store-books': [{ bookId: 'BK-1', poster: blob('covers/BK-1.jpg') }],
  authors: [{ authorId: 'AU-1', avatar: blob('authors/AU-1.png') }],
  bundles: [{ bundleId: 'BL-1', poster: blob('artwork/bundles/BL-1.png') }],
  collections: [{ collectionId: 'CL-1', poster: blob('artwork/collections/CL-1.png') }],
  categories: [{ categoryId: 'CA-1', thumbnail: blob('artwork/categories/CA-1.png') }],
});

void describe('load guards', () => {
  void it('accepts a seed whose images all live on Vercel Blob', () => {
    assert.doesNotThrow(() => assertBlobImages(data()));
  });

  void it('refuses legacy file names or other hosts', () => {
    const legacy = { ...data(), 'store-books': [{ bookId: 'BK-1', poster: 'harry-potter-Ab3dE5fG7h-1698765432101.jpg' }] };
    assert.throws(() => assertBlobImages(legacy), /1 image field\(s\) are not Vercel Blob URLs \(run upload\): store-books BK-1/);
    const elsewhere = { ...data(), authors: [{ authorId: 'AU-1', avatar: 'https://example.com/a.png' }] };
    assert.throws(() => assertBlobImages(elsewhere), /authors AU-1/);
  });

  void it('only loads into pageaters_api', () => {
    assert.doesNotThrow(() => assertTargetDb('pageaters_api'));
    assert.throws(() => assertTargetDb('test'), /"test", expected "pageaters_api"/);
  });
});

void describe('load operations', () => {
  const id = new ObjectId();
  const doc = { _id: id, title: 'Circe' };

  void it('only inserts missing catalog documents by default, so later edits survive a rerun', () => {
    assert.deepEqual(catalogOps([doc], false), [{ updateOne: { filter: { _id: id }, update: { $setOnInsert: doc }, upsert: true } }]);
  });

  void it('replaces catalog documents in sync mode', () => {
    assert.deepEqual(catalogOps([doc], true), [{ replaceOne: { filter: { _id: id }, replacement: doc, upsert: true } }]);
  });

  void it('keeps account credentials in step with .env but sets the rest only on insert', () => {
    const [op] = userOps([{ _id: id, email: 'a@b.co', salt: 's', password: 'h', role: 'ADMIN', fullName: 'Super Admin' }]);
    assert.deepEqual(op, {
      updateOne: {
        filter: { _id: id },
        update: { $set: { email: 'a@b.co', salt: 's', password: 'h', role: 'ADMIN' }, $setOnInsert: { fullName: 'Super Admin' } },
        upsert: true,
      },
    });
  });

  void it('creates the shopper’s address, cart and favourites only when missing', () => {
    assert.deepEqual(insertMissingOps([doc]), [{ updateOne: { filter: { _id: id }, update: { $setOnInsert: doc }, upsert: true } }]);
  });
});

void describe('load CLI safety', () => {
  void it('accepts only the known options', () => {
    assert.deepEqual(parseArgs(['--', '--dry-run']), { dryRun: true, sync: false });
    assert.deepEqual(parseArgs(['--sync']), { dryRun: false, sync: true });
    assert.throws(() => parseArgs(['--dryrun']), /unknown option\(s\): --dryrun/);
  });

  void it('keeps connection strings and emails out of error messages', () => {
    const message = 'Invalid connection string "mongodb+srv://user:pa55@cluster0.example.net/db" dup key: { email: "owner@example.com" }';
    const clean = redact(message);
    assert.doesNotMatch(clean, /pa55|owner@example\.com|mongodb\+srv/);
    assert.match(clean, /<connection string>.*<email>/);
  });
});
