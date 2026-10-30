const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

require('./helpers');
const { fakeModule, leakyError } = require('./helpers/fake-module');

// The storage adapter (src/adapters/storage): the Vercel Blob adapter against a fake SDK module (call shape: public,
// no random suffix, no overwrite, long cache, bounded, the token passed explicitly; clean errors; missing key) and
// the mock (fake https URL on a reserved domain, bounded recording, no disk). Uploads over HTTP are in file.test.js.

const blob = require('../src/adapters/storage/blob');
const mock = require('../src/adapters/storage/mock');

const FILE = { pathname: 'uploads/authors/test-photo-abcdefghij-1700000000000.png', body: Buffer.from('not-really-a-png'), contentType: 'image/png' };

const fakeBlob = (put) => {
  const calls = [];
  fakeModule('@vercel/blob', {
    put:
      put ??
      (async (pathname, body, options) => {
        calls.push({ pathname, body, options });
        return { url: `https://fakestore.public.blob.vercel-storage.com/${pathname}`, pathname, contentType: options.contentType };
      }),
  });
  return calls;
};

describe('Vercel Blob storage adapter', () => {
  test('stores the file publicly at the given path with a long cache, bounded, and answers its URL', async () => {
    const calls = fakeBlob();
    const adapter = blob.create({ token: 'fake-blob-token' });
    assert.equal(adapter.name, 'blob');

    assert.deepEqual(await adapter.put({ ...FILE, extra: 'ignored' }), {
      url: `https://fakestore.public.blob.vercel-storage.com/${FILE.pathname}`,
      pathname: FILE.pathname,
    });
    assert.equal(calls.length, 1);
    const [{ pathname, body, options }] = calls;
    assert.equal(pathname, FILE.pathname);
    assert.equal(body, FILE.body);
    const { abortSignal, ...rest } = options;
    assert.deepEqual(rest, {
      access: 'public',
      token: 'fake-blob-token',
      contentType: 'image/png',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 31_536_000,
    });
    assert.ok(abortSignal instanceof AbortSignal, 'every call is bounded');
    assert.equal(blob.TIMEOUT_MS, 10_000);
  });

  test('rejects with a clean error carrying only the status when the SDK rejects', async () => {
    fakeBlob(async () => {
      throw leakyError({ status: 403, name: 'BlobAccessError', response: { url: 'https://blob.vercel-storage.com/?token=fake' } });
    });
    await assert.rejects(blob.create({ token: 'fake-blob-token' }).put(FILE), (error) => {
      assert.equal(error.message, 'Storage upload failed');
      assert.deepEqual({ ...error }, { status: 403 });
      assert.equal(error.cause, undefined);
      assert.doesNotMatch(String(error.stack), /token|reader@example\.com/);
      return true;
    });
  });

  test('refuses to start without BLOB_READ_WRITE_TOKEN, before touching the SDK', () => {
    let required = false;
    fakeModule('@vercel/blob', {
      get put() {
        required = true;
        return async () => ({});
      },
    });
    for (const config of [undefined, {}, { token: '' }]) {
      assert.throws(() => blob.create(config), { message: 'The Vercel Blob storage adapter needs BLOB_READ_WRITE_TOKEN' });
    }
    assert.equal(required, false);
  });
});

describe('mock storage adapter', () => {
  test('answers a fake https URL on a reserved domain and records path, type, size and hash', async () => {
    mock.clear();
    const stored = await mock.put(FILE);
    assert.deepEqual(stored, { url: `https://storage.mock.invalid/${FILE.pathname}`, pathname: FILE.pathname });
    assert.deepEqual(mock.list(), [
      {
        pathname: FILE.pathname,
        url: stored.url,
        contentType: 'image/png',
        size: FILE.body.length,
        sha256: crypto.createHash('sha256').update(FILE.body).digest('hex'),
      },
    ]);
    assert.ok(Object.isFrozen(mock.list()[0]));
    mock.clear();
    assert.deepEqual(mock.list(), []);
  });

  test('keeps only the newest 50 files, never writes to disk or the console', async (t) => {
    const writes = ['log', 'info', 'warn', 'error', 'debug'].map((method) => t.mock.method(console, method, () => {}));
    const diskWrites = ['writeFile', 'writeFileSync', 'createWriteStream', 'appendFile', 'appendFileSync'].map((method) =>
      t.mock.method(fs, method, () => {
        throw new Error('disk write');
      }),
    );
    mock.clear();
    for (let i = 1; i <= 55; i += 1) await mock.put({ ...FILE, pathname: `uploads/books/file-${i}.png` });
    const files = mock.list();
    assert.equal(files.length, 50);
    assert.deepEqual([files[0].pathname, files.at(-1).pathname], ['uploads/books/file-6.png', 'uploads/books/file-55.png']);
    assert.equal(
      [...writes, ...diskWrites].reduce((count, spy) => count + spy.mock.callCount(), 0),
      0,
    );
    mock.clear();
  });
});
