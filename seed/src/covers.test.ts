import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { booksApiUrl, chunk, lookupIsbns, missReason, parseBooksResponse, parseSearchResponse, titlesMatch, usable } from './covers.ts';

// node:test's describe/it return promises the runner tracks itself.

const book = (bookId: string, ISBN: string, title = 'Circe') => ({ bookId, ISBN, title });
const edition = (title: string, coverId?: number) => ({ source: 'edition' as const, title, ...(coverId ? { coverId } : {}) });
const work = (title: string, coverId?: number) => ({ source: 'work' as const, title, ...(coverId ? { coverId } : {}) });

void describe('Open Library responses', () => {
  void it('batches ISBNs into one Books API request', () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.equal(
      booksApiUrl(['9780747532743', '080442957X']),
      'https://openlibrary.org/api/books?bibkeys=ISBN:9780747532743,ISBN:080442957X&format=json&jscmd=data',
    );
  });

  void it('looks up valid ISBNs only', () => {
    assert.deepEqual(lookupIsbns([book('B1', '9780747532743'), book('B2', ''), book('B3', '978074753274')]), ['9780747532743']);
  });

  void it('reads edition covers from the Books API', () => {
    const editions = parseBooksResponse({
      'ISBN:9780747532743': { title: 'Harry Potter', cover: { large: 'https://covers.openlibrary.org/b/id/15155835-L.jpg' } },
      'ISBN:080442957X': { title: 'No Cover' },
    });
    assert.deepEqual(editions.get('9780747532743'), edition('Harry Potter', 15155835));
    assert.deepEqual(editions.get('080442957X'), edition('No Cover'));
    assert.equal(parseBooksResponse(null).size, 0);
  });

  void it('reads the work cover from search', () => {
    assert.deepEqual(parseSearchResponse({ docs: [{ title: 'Punk 57', cover_i: 10107803 }] }), work('Punk 57', 10107803));
    assert.deepEqual(parseSearchResponse({ docs: [{ title: 'Circe' }] }), work('Circe'));
    assert.equal(parseSearchResponse({ docs: [] }), undefined);
  });
});

void describe('choosing covers', () => {
  void it('prefers the edition cover, then the work cover, and skips mismatched titles', () => {
    const picked = usable(book('B1', '9780747532743', 'Circe'), [edition('Six of Crows', 1), work('Circe', 2)]);
    assert.deepEqual(
      picked.map((c) => c.coverId),
      [2],
    );
  });

  void it('accepts a reviewed title mismatch only for the reviewed Open Library title', () => {
    assert.equal(usable(book('BK-9343010551', '9780747532743', 'Forever and a Day'), [edition('Bond [Paperback]', 1)]).length, 1);
    assert.equal(usable(book('BK-9343010551', '9780747532743', 'Forever and a Day'), [work('Casino Royale', 2)]).length, 0);
  });

  void it('names why a book has no cover', () => {
    assert.equal(missReason(book('B1', ''), []), 'no-isbn');
    assert.equal(missReason(book('B1', '978074753274'), []), 'invalid-isbn');
    assert.equal(missReason(book('B1', '9780747532743'), [undefined, undefined]), 'not-in-open-library');
    assert.equal(missReason(book('B1', '9780747532743'), [edition('Circe'), work('Circe')]), 'no-cover');
    assert.equal(missReason(book('B1', '9780747532743'), [edition('Six of Crows', 1)]), 'title-mismatch');
    assert.equal(missReason(book('B1', '9780747532743'), [edition('Circe', 1)]), 'download-failed');
  });

  void it('matches titles despite subtitles and punctuation, and flags different books', () => {
    assert.equal(titlesMatch('Atomic Habits', 'Atomic habits : an easy & proven way to build good habits'), true);
    assert.equal(titlesMatch('Ikigai', 'The Silent Patient'), false);
  });
});
