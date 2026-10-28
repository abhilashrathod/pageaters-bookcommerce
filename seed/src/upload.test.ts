import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyImages, blobPathname, imageSources, sha256, type ManifestEntry } from './upload.ts';

// node:test's describe/it return promises the runner tracks itself.

const entry = (seedName: ManifestEntry['seedName'], id: string, url: string): ManifestEntry => ({
  seedName,
  id,
  file: '',
  pathname: '',
  url,
  sha256: '',
  bytes: 1,
  contentType: 'image/png',
});

void describe('upload', () => {
  void it('names blobs by content', () => {
    const hash = sha256(Buffer.from('cover'));
    assert.equal(blobPathname('covers/BK-1-123.jpg', hash), `catalog/covers/BK-1-123-${hash.slice(0, 12)}.jpg`);
    assert.notEqual(blobPathname('covers/BK-1-123.jpg', sha256(Buffer.from('other'))), blobPathname('covers/BK-1-123.jpg', hash));
  });

  void it('takes one image per item from covers, author images and artwork', () => {
    const sources = imageSources(
      [{ bookId: 'BK-1', isbn: '', title: '', source: 'edition', coverId: 7, openLibraryTitle: '' }],
      [{ authorId: 'AU-1', name: '', file: 'AU-1.png', kind: 'initials' }],
      [
        { kind: 'books', id: 'BK-2', file: 'books/BK-2.png' },
        { kind: 'categories', id: 'CA-1', file: 'categories/CA-1.png' },
      ],
    );
    assert.deepEqual(sources, [
      { seedName: 'store-books', id: 'BK-1', file: 'covers/BK-1-7.jpg' },
      { seedName: 'authors', id: 'AU-1', file: 'authors/AU-1.png' },
      { seedName: 'store-books', id: 'BK-2', file: 'artwork/books/BK-2.png' },
      { seedName: 'categories', id: 'CA-1', file: 'artwork/categories/CA-1.png' },
    ]);
  });

  void it('points image fields at Blob URLs and clears legacy extra images', () => {
    const linked = applyImages(
      {
        'store-books': [{ bookId: 'BK-1', poster: 'old.jpg', images: ['a.jpg'] }],
        authors: [{ authorId: 'AU-1', avatar: '' }],
        bundles: [{ bundleId: 'BL-1', poster: '' }],
        collections: [{ collectionId: 'CL-1', poster: '' }],
        categories: [{ categoryId: 'CA-1', thumbnail: '', meta: { title: 't', imageUrl: '' } }],
      },
      [
        entry('store-books', 'BK-1', 'https://b/1.jpg'),
        entry('authors', 'AU-1', 'https://b/a.png'),
        entry('bundles', 'BL-1', 'https://b/bl.png'),
        entry('collections', 'CL-1', 'https://b/cl.png'),
        entry('categories', 'CA-1', 'https://b/ca.png'),
      ],
    );
    assert.deepEqual(linked['store-books'], [{ bookId: 'BK-1', poster: 'https://b/1.jpg', images: [] }]);
    assert.equal(linked.authors?.[0]?.avatar, 'https://b/a.png');
    assert.deepEqual(linked.categories?.[0], {
      categoryId: 'CA-1',
      thumbnail: 'https://b/ca.png',
      meta: { title: 't', imageUrl: 'https://b/ca.png' },
    });
  });

  void it('refuses to leave a document without an image', () => {
    assert.throws(
      () => applyImages({ 'store-books': [{ bookId: 'BK-9', poster: '' }] }, []),
      /no image for 1 document\(s\): store-books BK-9/,
    );
  });
});
