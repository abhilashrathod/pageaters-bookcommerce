const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const { assertBody, assertGuarded, createUser, envelopes, startTestApp } = require('./helpers');
const storage = require('../src/adapters/storage');

// POST /api/v1/file/upload (admin image upload through the mock storage adapter) over HTTP, written against the
// legacy controller before the service refactor.

const { ok, badRequest, serverError } = envelopes;

const File = () => mongoose.model('file');

let api;
let admin;

const uploads = () => storage.list();

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  admin = await createUser({ role: 'ADMIN' });
});

// Multipart upload through the app's multer middleware (api.request only sends JSON).
const upload = async ({ fields = {}, file, cookie = admin.cookie } = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) [value].flat().forEach((item) => form.append(key, item));
  if (file) form.append('file', new Blob([file.content], { type: file.type }), file.name);
  const res = await fetch(`${api.baseUrl}/file/upload`, { method: 'POST', body: form, headers: cookie ? { cookie } : {}, signal: AbortSignal.timeout(10_000) });
  return { status: res.status, body: await res.json() };
};

const PNG = { name: 'cover.png', type: 'image/png', content: 'not-really-a-png' };

describe('POST /file/upload', () => {
  test('needs an ADMIN session', async () => {
    const shopper = await createUser();
    await assertGuarded(api, ['POST', '/file/upload', {}], { admin: true, userCookie: shopper.cookie });
  });

  // 6b: answers the file's public URL (was: the storage key), and the File record is written before the answer
  // (was: not awaited).
  test("stores the file under its module's folder and answers its public URL", async () => {
    const res = await upload({ fields: { fileModule: 'AUTHOR', title: 'Test Author Photo' }, file: PNG });
    assert.equal(res.status, 200);
    const [stored] = uploads();
    assert.match(stored.pathname, /^uploads\/authors\/test-author-photo-[A-Za-z0-9]{10}-\d+\.png$/);
    assert.equal(stored.url, `https://storage.mock.invalid/${stored.pathname}`);
    assert.equal(stored.contentType, 'image/png');
    assert.equal(stored.sha256, crypto.createHash('sha256').update(PNG.content).digest('hex'));
    assert.equal(JSON.stringify(res.body), JSON.stringify(ok('FILE_UPLOADED', { fileUrl: stored.url })));

    const fileName = stored.pathname.split('/').pop();
    const record = await File().findOne({ fileName });
    assert.equal(record.fileModule, 'AUTHOR');
    assert.equal(record.fileUrl, stored.url);
    assert.equal(record.mimeType, 'image/png');
  });

  test('picks the folder per module, and the content type from the extension', async () => {
    const cases = [
      ['STORE_BOOK', 'books'],
      ['COLLECTION', 'collections'],
      ['CATEGORY', 'categories'],
      ['BUNDLE', 'bundles'],
      ['ASSETS', 'assets'],
    ];
    for (const [fileModule, folder] of cases) {
      storage.clear();
      await upload({ fields: { fileModule, title: 'x' }, file: PNG });
      assert.match(uploads()[0].pathname, new RegExp(`^uploads/${folder}/x-`), fileModule);
    }
    assert.equal(await File().countDocuments(), cases.length);

    storage.clear();
    await upload({ fields: { fileModule: 'AUTHOR', title: 'x' }, file: { ...PNG, name: 'photo.jpeg', type: 'text/html' } });
    assert.equal(uploads()[0].contentType, 'image/jpeg', 'never the client-sent type');
  });

  // Phase 4: the module is checked before the upload. Was: an unknown, missing or array module went to the book
  // bucket and answered 200, then the unawaited File.create failed model validation as an unhandled rejection,
  // leaving an orphaned S3 object.
  test('refuses a missing, unknown or array fileModule with INVALID_FILE before uploading', async () => {
    const invalid = [{}, { fileModule: 'NOPE' }, { fileModule: 'author' }, { 'fileModule[]': 'AUTHOR' }, { fileModule: ['AUTHOR', 'AUTHOR'] }];
    for (const fields of invalid) {
      assertBody(await upload({ fields: { ...fields, title: 'x' }, file: PNG }), 400, badRequest('INVALID_FILE'));
    }
    assert.deepEqual(uploads(), []);
    assert.equal(await File().countDocuments(), 0);
  });

  test('DEFAULT uploads to the books folder', async () => {
    assert.equal((await upload({ fields: { fileModule: 'DEFAULT', title: 'x' }, file: PNG })).status, 200);
    assert.match(uploads()[0].pathname, /^uploads\/books\//);
    assert.equal(await File().countDocuments(), 1);
  });

  test('refuses a request without a file, or with an unsupported extension', async () => {
    assertBody(await upload({ fields: { title: 'x' } }), 400, badRequest('NO_FILE_PRESENT'));
    assertBody(await upload({ fields: { title: 'x' }, file: { ...PNG, name: 'cover.gif' } }), 400, badRequest('UNSUPPORTED_FILE_TYPE'));
    assert.deepEqual(uploads(), []);
  });

  test('legacy: a JSON body (no multipart) answers 500', async () => {
    assertBody(await api.request('/file/upload', { method: 'POST', body: { title: 'x' }, cookie: admin.cookie }), 500, serverError);
  });

  test('a storage failure answers 500 and records nothing', async (t) => {
    t.mock.method(storage, 'put', async () => {
      throw Object.assign(new Error('Storage upload failed'), { status: 503 });
    });
    assertBody(await upload({ fields: { fileModule: 'AUTHOR', title: 'x' }, file: PNG }), 500, serverError);
    assert.equal(await File().countDocuments(), 0);
  });

  // 6b: the record write is awaited, so its failure answers 500 (was: an unhandled rejection after a 200).
  test('a failed record write answers 500', async (t) => {
    t.mock.method(File(), 'create', async () => {
      throw new Error('write failed');
    });
    assertBody(await upload({ fields: { fileModule: 'AUTHOR', title: 'x' }, file: PNG }), 500, serverError);
    assert.equal(uploads().length, 1, 'the file itself was stored');
  });
});
