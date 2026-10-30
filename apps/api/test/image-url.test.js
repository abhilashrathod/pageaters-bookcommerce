const { test } = require('node:test');
const assert = require('node:assert/strict');

const { imageUrl } = require('../src/helpers/image-url.helper');

// 6b: catalog image fields hold full public URLs (Vercel Blob from the seed, the upload's answer from the admin), so
// the helper passes them through; the legacy CDN resizer URLs built from S3 keys are gone.

test('passes absolute https URLs through, normalised', () => {
  for (const url of [
    'https://abc123.public.blob.vercel-storage.com/catalog/covers/BK-1-0123456789ab.jpg',
    'https://storage.mock.invalid/uploads/books/x-abcdefghij-1700000000000.png',
  ]) {
    assert.equal(imageUrl(url), url);
  }
  assert.equal(imageUrl('https://images.example.com/a cover".png'), 'https://images.example.com/a%20cover%22.png');
  assert.equal(imageUrl('HTTPS://Images.Example.com'), 'https://images.example.com/');
});

test('anything else has no public URL: legacy keys, other schemes, empty or missing values', () => {
  for (const value of ['http://images.example.com/cover.png', 'test-cover.png', 'catalog/covers/x.jpg', '//cdn.example.com/x.png', 'javascript:alert(1)', 'data:image/png;base64,AA', '', undefined, null, 42]) {
    assert.equal(imageUrl(value), '', String(value));
  }
});
