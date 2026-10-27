import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  initials,
  initialsAvatar,
  matchByIsbn,
  matchBySearch,
  nameWords,
  namesAgree,
  parseAuthorPhoto,
  parseAuthorSearch,
  parseEditionAuthors,
  sameName,
} from './authors.ts';

// node:test's describe/it return promises the runner tracks itself.

void describe('author names', () => {
  void it('normalises accents, case and punctuation', () => {
    assert.deepEqual(nameWords('S.A. Chakraborty'), ['s', 'a', 'chakraborty']);
    assert.equal(sameName('Gabriel García Márquez', 'gabriel garcia marquez'), true);
    assert.equal(sameName('J.K. Rowling', 'J. K. Rowling'), true);
    assert.equal(sameName('', ''), false);
  });

  void it('lets an edition author agree on surname and first initial only', () => {
    assert.equal(namesAgree('J.K. Rowling', 'Joanne Rowling'), true);
    assert.equal(namesAgree('Madeline Miller', 'Mary GrandPré'), false);
    assert.equal(namesAgree('Rowling', 'Joanne Rowling'), false);
  });
});

void describe('Open Library responses', () => {
  void it('reads edition authors from the Books API', () => {
    const editions = parseEditionAuthors({
      'ISBN:9780747532743': { authors: [{ url: 'http://openlibrary.org/authors/OL23919A/J._K._Rowling', name: 'J. K. Rowling' }] },
      'ISBN:080442957X': {},
    });
    assert.deepEqual(editions.get('9780747532743'), [{ olid: 'OL23919A', name: 'J. K. Rowling' }]);
    assert.deepEqual(editions.get('080442957X'), []);
  });

  void it('reads author search results and photos', () => {
    assert.deepEqual(
      parseAuthorSearch({ docs: [{ key: 'OL1926056A', name: 'Madeline Miller', top_work: 'The Song of Achilles' }, { key: 'bad' }] }),
      [{ olid: 'OL1926056A', name: 'Madeline Miller', topWork: 'The Song of Achilles' }],
    );
    assert.equal(parseAuthorPhoto({ photos: [-1, 5543033] }), 5543033);
    assert.equal(parseAuthorPhoto({ photos: [-1] }), undefined);
    assert.equal(parseAuthorPhoto({}), undefined);
  });
});

void describe('matching', () => {
  const editions = new Map([
    [
      '9780747532743',
      [
        { olid: 'OL2A', name: 'Mary GrandPré' },
        { olid: 'OL23919A', name: 'J. K. Rowling' },
      ],
    ],
  ]);

  void it('matches on one of the author’s own ISBNs, skipping illustrators', () => {
    assert.equal(matchByIsbn('J.K. Rowling', ['9780747532743'], editions)?.olid, 'OL23919A');
    assert.equal(matchByIsbn('Stephen King', ['9780747532743'], editions), undefined);
  });

  void it('prefers an exact name on any edition over a looser match', () => {
    const shared = new Map([
      ['9780000000002', [{ olid: 'OL1A', name: 'Ilsa J. Bick' }]],
      ['9780000000019', [{ olid: 'OL2A', name: 'Ian Bick' }]],
    ]);
    assert.equal(matchByIsbn('Ian Bick', ['9780000000002', '9780000000019'], shared)?.olid, 'OL2A');
  });

  void it('needs an exact name and a known work to match by search', () => {
    const found = [
      { olid: 'OL9958254A', name: 'Madeline Miller', topWork: 'Airplanes' },
      { olid: 'OL1926056A', name: 'Madeline Miller', topWork: 'The Song of Achilles' },
    ];
    assert.equal(matchBySearch('Madeline Miller', ['Circe', 'The Song of Achilles'], found)?.olid, 'OL1926056A');
    assert.equal(matchBySearch('Madeline Miller', ['Circe'], found), undefined);
    assert.equal(matchBySearch('Madeline Millar', ['The Song of Achilles'], found), undefined);
  });
});

void describe('initials avatar', () => {
  void it('uses first and last initials', () => {
    assert.equal(initials('S.A. Chakraborty'), 'SC');
    assert.equal(initials('Homer'), 'H');
    assert.equal(initials('Gabriel García Márquez'), 'GM');
  });

  void it('renders brand colours and escapes the name', () => {
    const svg = initialsAvatar('Tom & Jerry');
    assert.match(svg, /fill="#ff5f25"/);
    assert.match(svg, /aria-label="Tom &#38; Jerry"/);
    assert.match(svg, />TJ</);
    const hostile = initialsAvatar('"><script>alert(1)</script>');
    assert.doesNotMatch(hostile, /<script|"></);
  });
});
