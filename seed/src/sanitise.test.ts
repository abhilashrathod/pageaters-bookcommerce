import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sanitise, type Doc, type Dump } from './sanitise.ts';
import { generateStock } from './stock.ts';

// node:test's describe/it return promises the runner tracks itself.

const oid = (n: number) => ({ $oid: n.toString(16).padStart(24, '0') });

function book(n: number, overrides: Doc = {}): Doc {
  return {
    _id: oid(n),
    bookId: `B${n}`,
    title: `Book ${n}`,
    author: oid(100),
    language: 'EN',
    availability: 'available',
    categories: [oid(200)],
    relatedBooks: [],
    relatedBundles: [],
    relatedCollections: [],
    bundledBooks: [],
    wholeSalePriceHistory: [123],
    inventory: 7,
    __v: 3,
    isDeleted: false,
    deletedAt: '',
    ...overrides,
  };
}

function fixture(): Dump {
  return {
    authors: [
      { _id: oid(100), name: 'Author', books: [oid(1), oid(2)], isDeleted: false, deletedAt: 'Tue May 03 2022' },
      { _id: oid(101), name: 'Gone', books: [], isDeleted: true },
    ],
    bundles: [
      {
        _id: oid(500),
        title: 'Bundle',
        bundledBooks: [oid(1), oid(2)],
        categories: [oid(200)],
        relatedCollections: [oid(300)],
        // Points at a live book, not a bundle: wrong target collection.
        relatedBundles: [oid(1)],
        isDeleted: false,
      },
    ],
    categories: [
      { _id: oid(200), title: 'Fiction', numberOfBooks: 99, meta: { title: 't', url: 'https://old.example/fiction' }, isDeleted: false },
    ],
    collections: [{ _id: oid(300), title: 'Picks', books: [oid(1), oid(2), oid(999)], featuredAuthors: [oid(101)], isDeleted: false }],
    product_sets: [
      {
        _id: oid(400),
        title: 'Set',
        isActive: true,
        deactivatedAt: 'Tue May 03 2022',
        products: [{ product: oid(1) }, { product: oid(2) }],
      },
      { _id: oid(401), title: 'Old set', isActive: false, deactivatedAt: 'Tue May 03 2022', products: [{ product: oid(1) }] },
    ],
    storebooks: [book(1, { relatedBooks: [oid(2)], ISBN: '\u200e 978-0-7475-3274-3 ' }), book(2, { isDeleted: true }), book(3)],
  };
}

void describe('sanitise', () => {
  const { data, report } = sanitise(fixture());
  const books = data['store-books'] ?? [];

  void it('drops soft-deleted documents and inactive product sets', () => {
    assert.deepEqual(
      books.map((b) => b.bookId),
      ['B1', 'B3'],
    );
    assert.equal(data.authors?.length, 1);
    assert.deepEqual(
      data['product-sets']?.map((set) => set.title),
      ['Set'],
    );
  });

  void it('never copies wholesale prices, real inventory or internal fields', () => {
    const [first] = books;
    assert.ok(first);
    assert.equal('wholeSalePriceHistory' in first, false);
    assert.equal('__v' in first, false);
    assert.equal(first.inventory, generateStock(oid(1).$oid));
  });

  void it('produces identical output on every run', () => {
    assert.deepEqual(sanitise(fixture()), { data, report });
  });

  void it('prunes references to removed and missing documents', () => {
    assert.deepEqual(books[0]?.relatedBooks, []);
    assert.deepEqual(data.authors?.[0]?.books, [oid(1)]);
    assert.deepEqual(data.collections?.[0]?.books, [oid(1)]);
    assert.deepEqual(data.collections?.[0]?.featuredAuthors, []);
    assert.deepEqual(data['product-sets']?.[0]?.products, [{ product: oid(1) }]);
    assert.deepEqual(data.bundles?.[0]?.bundledBooks, [oid(1)]);
    assert.deepEqual(data.bundles?.[0]?.relatedCollections, [oid(300)]);
    assert.equal(report.prunedRefs, 8);
  });

  void it('drops references that point at a live document of the wrong collection', () => {
    assert.deepEqual(data.bundles?.[0]?.relatedBundles, []);
  });

  void it('recounts category books and clears legacy canonical URLs', () => {
    assert.equal(data.categories?.[0]?.numberOfBooks, 2);
    assert.deepEqual(data.categories?.[0]?.meta, { title: 't', url: '' });
  });

  void it('clears stray deletion dates on kept documents', () => {
    assert.equal(data.authors?.[0]?.deletedAt, '');
    assert.equal(data['product-sets']?.[0]?.deactivatedAt, '');
  });

  void it('normalises language codes and ISBNs', () => {
    assert.equal(books[0]?.language, 'English');
    assert.equal(books[0]?.ISBN, '9780747532743');
  });

  void it('reports fields that are not allowlisted instead of copying them', () => {
    const dump = fixture();
    dump.storebooks = [book(1, { supplierNote: 'x' })];
    const result = sanitise(dump);
    assert.deepEqual(result.report.unknownFields, ['storebooks.supplierNote']);
    assert.equal('supplierNote' in (result.data['store-books']?.[0] ?? {}), false);
  });

  void it('applies the allowlist inside nested objects', () => {
    const dump = fixture();
    dump.categories = [{ _id: oid(200), meta: { title: 't', ownerEmail: 'x' } }];
    dump.product_sets = [{ _id: oid(400), products: [{ product: oid(1), cost: 1 }] }];
    const result = sanitise(dump);
    assert.deepEqual(result.report.unknownFields, ['categories.meta.ownerEmail', 'product_sets.products[].cost']);
    assert.deepEqual(result.data.categories?.[0]?.meta, { title: 't', url: '' });
    assert.deepEqual(result.data['product-sets']?.[0]?.products, [{ product: oid(1) }]);
  });

  void it('fails when a live book points at a removed author', () => {
    const dump = fixture();
    dump.storebooks = [book(1, { author: oid(101) })];
    assert.throws(() => sanitise(dump), /no live author/);
  });

  void it('fails when a dump file is missing', () => {
    const dump = fixture();
    delete dump.bundles;
    assert.throws(() => sanitise(dump), /pageaters\.bundles\.json/);
  });
});

void describe('generateStock', () => {
  void it('is deterministic per document', () => {
    assert.equal(generateStock('abc'), generateStock('abc'));
  });

  void it('stays within 0–1000 and leaves some books out of stock', () => {
    const stocks = Array.from({ length: 1000 }, (_, n) => generateStock(`id${n}`));
    assert.ok(stocks.every((stock) => stock >= 0 && stock <= 1000));
    const outOfStock = stocks.filter((stock) => stock === 0).length;
    assert.ok(outOfStock > 20 && outOfStock < 100);
  });
});
