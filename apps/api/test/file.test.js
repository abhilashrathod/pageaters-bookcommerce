const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createUser, mockVendorCall, startTestApp } = require('./helpers');
const { assertBody, assertGuarded, envelopes, eventually, stopApp } = require('./helpers/fixtures/store');

// POST /api/v1/file/upload (admin image upload to S3, mocked) over HTTP, written against the legacy controller
// before the service refactor.

const { ok, badRequest, serverError } = envelopes;

const File = () => mongoose.model('file');

let api;
let admin;
let uploads;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await stopApp(api);
});

beforeEach(async () => {
  await api.reset();
  admin = await createUser({ role: 'ADMIN' });
  uploads = [];
  mockVendorCall('S3.upload', (params) => {
    uploads.push(params);
    return { promise: async () => ({ Location: `https://files.example.com/${params.Bucket}/${params.Key}` }) };
  });
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

  test('uploads to the bucket of the file module and answers the storage key (legacy: not a URL)', async () => {
    const res = await upload({ fields: { fileModule: 'AUTHOR', title: 'Test Author Photo' }, file: PNG });
    assert.equal(res.status, 200);
    const [params] = uploads;
    assert.equal(params.Bucket, 'pageaters-authors');
    assert.match(params.Key, /^test-author-photo-[A-Za-z0-9]{10}-\d+\.png$/);
    assert.equal(Buffer.from(params.Body).toString(), PNG.content);
    assert.equal(JSON.stringify(res.body), JSON.stringify(ok('FILE_UPLOADED', { fileUrl: params.Key })));

    // Legacy: the File record is created without awaiting it.
    const record = await eventually(() => File().findOne({ fileName: params.Key }));
    assert.equal(record.fileModule, 'AUTHOR');
    assert.equal(record.fileUrl, `https://files.example.com/pageaters-authors/${params.Key}`);
    assert.equal(record.mimeType, 'image/png');
  });

  // Legacy, not tested: an unknown or missing fileModule goes to the book bucket and answers 200, but the
  // unawaited File.create then fails model validation as an unhandled rejection (it would fail this test file).
  test('picks the bucket per module', async () => {
    const cases = [
      ['STORE_BOOK', 'storebooks'],
      ['COLLECTION', 'pageaters-collections'],
      ['CATEGORY', 'pageaters-categories'],
      ['BUNDLE', 'pageaters-bundles'],
      ['ASSETS', 'pageaters-assets'],
    ];
    for (const [fileModule, bucket] of cases) {
      uploads = [];
      await upload({ fields: { fileModule, title: 'x' }, file: PNG });
      assert.equal(uploads[0].Bucket, bucket, fileModule);
    }
    await eventually(async () => (await File().countDocuments()) === cases.length);
  });

  test('legacy: an array fileModule (`fileModule[]=AUTHOR` or a repeated field) goes to the book bucket', async (t) => {
    // The File record can't store an array (an unhandled rejection after the response, see above), so the write is
    // stubbed here; this test is about the bucket.
    t.mock.method(File(), 'create', async () => {});
    for (const fields of [{ 'fileModule[]': 'AUTHOR' }, { fileModule: ['AUTHOR', 'AUTHOR'] }]) {
      uploads = [];
      const res = await upload({ fields: { ...fields, title: 'x' }, file: PNG });
      assert.equal(res.status, 200);
      assert.equal(uploads[0].Bucket, 'storebooks');
    }
  });

  test('refuses a request without a file, or with an unsupported extension', async () => {
    assertBody(await upload({ fields: { title: 'x' } }), 400, badRequest('NO_FILE_PRESENT'));
    assertBody(await upload({ fields: { title: 'x' }, file: { ...PNG, name: 'cover.gif' } }), 400, badRequest('UNSUPPORTED_FILE_TYPE'));
    assert.deepEqual(uploads, []);
  });

  test('legacy: a JSON body (no multipart) answers 500', async () => {
    assertBody(await api.request('/file/upload', { method: 'POST', body: { title: 'x' }, cookie: admin.cookie }), 500, serverError);
  });

  test('an S3 failure answers 500 and records nothing', async () => {
    mockVendorCall('S3.upload', () => ({
      promise: async () => {
        throw new Error('S3 down');
      },
    }));
    assertBody(await upload({ fields: { title: 'x' }, file: PNG }), 500, serverError);
    assert.equal(await File().countDocuments(), 0);
  });
});
