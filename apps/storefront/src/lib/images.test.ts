import assert from 'node:assert/strict';
import { test } from 'node:test';

import { imageSrc } from './images.ts';

void test('keeps Blob and Open Library images', () => {
  for (const url of ['https://n8qy5.public.blob.vercel-storage.com/books/a.jpg', 'https://covers.openlibrary.org/b/id/1-L.jpg']) {
    assert.equal(imageSrc(url), url);
  }
});

void test('drops other hosts, plain http, relative paths and blanks', () => {
  for (const url of [
    'https://storebooks.s3.ap-south-1.amazonaws.com/a.jpg',
    'http://covers.openlibrary.org/b/id/1-L.jpg',
    'https://evil.com/x.public.blob.vercel-storage.com',
    'cover.jpg',
    '',
    null,
  ]) {
    assert.equal(imageSrc(url), null);
  }
});
