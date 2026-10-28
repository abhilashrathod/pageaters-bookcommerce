import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addOnGroupsResponseSchema, addOnSchema } from './add-on.ts';
import { authorListResponseSchema, authorSchema } from './author.ts';
import { bookDetailResponseSchema, bookListResponseSchema, bookSchema, categoryProductsResponseSchema } from './book.ts';
import type { Book } from './book.ts';
import { bundleSchema } from './bundle.ts';
import { categorySchema } from './category.ts';
import { collectionListResponseSchema, collectionSchema } from './collection.ts';
import { dealListResponseSchema, dealSchema } from './deal.ts';
import { metaSchema } from './meta.ts';
import { mysteryBoxSchema } from './mystery-box.ts';
import { productSetDetailResponseSchema, productSetSchema } from './product-set.ts';

// Compile-time only: supplier prices and soft-delete internals are not part of the contract.
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
const _noWholesale: HasKey<Book, 'wholeSalePriceHistory'> = false;
const _noIsDeleted: HasKey<Book, 'isDeleted'> = false;

const id = (n: number) => n.toString(16).padStart(24, '0');
const at = '2023-04-05T06:07:08.090Z';
const blob = (name: string) => `https://abc123.public.blob.vercel-storage.com/catalog/${name}.jpg`;
const stamps = { createdAt: at, updatedAt: at };

const book = {
  _id: id(1),
  ...stamps,
  bookId: 'BK-0000000001',
  type: 'book',
  title: 'A Book',
  blindTitle: '',
  tagline: '',
  eyebrow: '',
  description: 'About a book.',
  tags: ['fantasy'],
  message: '',
  author: id(2),
  language: 'English',
  pages: 320,
  readingLevel: 'Beginner',
  version: 'paperback',
  books: -1,
  bundledBooks: [],
  dimensions: '12.9 x 2.3 x 19.7',
  weight: 662.2449,
  ISBN: '9780000000001',
  publicationYear: '11 April 2017',
  publisher: 'A Publisher',
  editorsPick: false,
  bestSeller: true,
  newRelease: false,
  preOrder: false,
  bookOfTheMonth: false,
  availability: 'available',
  poster: blob('covers/a-book'),
  images: [],
  totalReviews: 0,
  averageReviews: 0,
  inventory: 12,
  currentDiscount: 10,
  popularity: 7,
  priority: 0,
  categories: [id(3)],
  relatedBooks: [],
  relatedBundles: [],
  relatedCollections: [],
  price: 499,
  rentPrice: 249.5,
  membersPrice: 374.25,
  membersRentPrice: 0,
};

const author = {
  _id: id(2),
  ...stamps,
  authorId: 'AU-1',
  name: 'An Author',
  intro: '',
  avatar: blob('authors/an-author'),
  priority: 0,
  popularity: 3,
  books: [id(1)],
};

const meta = { title: 'Fantasy | Pageaters', description: '', imageUrl: blob('categories/fantasy'), url: '' };
const category = {
  _id: id(3),
  ...stamps,
  categoryId: 'CA-1',
  title: 'Fantasy',
  description: '',
  thumbnail: blob('categories/fantasy'),
  priority: 0,
  popularity: 0,
  numberOfBooks: 1,
  meta,
};

const collection = {
  _id: id(4),
  ...stamps,
  collectionId: 'CO-1',
  title: 'Summer reads',
  description: '',
  tags: [],
  poster: blob('collections/summer'),
  priority: 0,
  popularity: 0,
  books: [id(1)],
  relatedCollections: [],
  relatedCategories: [id(3)],
  featuredAuthors: [],
};

const bundle = {
  _id: id(5),
  ...stamps,
  bundleId: 'BU-1',
  title: 'Trilogy',
  description: '',
  tags: [],
  poster: blob('bundles/trilogy'),
  currentDiscount: 15,
  weight: 2454.4898,
  bundledBooks: [id(1)],
  categories: [],
  popularity: 0,
  priority: 0,
  price: 1299,
  membersPrice: 1099,
  relatedCollections: [],
  relatedBundles: [],
};

const productSet = {
  _id: id(6),
  ...stamps,
  setId: 'SET-1',
  slug: 'new-releases-abc123',
  title: 'New releases',
  description: '',
  products: [{ _id: id(7), product: id(1), priority: 1 }],
  categories: [],
};

const deal = {
  _id: id(8),
  ...stamps,
  dealId: 'DL-1',
  poster: blob('deals/sale'),
  ctaLink: '/sets/new-releases-abc123',
  ctaText: 'Shop now',
  title: 'Sale',
  description: '',
  priority: 0,
  productSets: [{ _id: id(9), priority: 1, set: id(6) }],
  categories: [],
};

const addOn = {
  _id: id(10),
  ...stamps,
  addOnId: 'AO-1',
  name: 'Bookmark',
  description: '',
  poster: blob('add-ons/bookmark'),
  category: 'bookmarks',
  priority: 0,
  price: 49,
  currentDiscount: 0,
  inventory: 100,
};

const mysteryBox = {
  _id: id(11),
  ...stamps,
  boxId: 'MB-1',
  title: 'Three mystery books',
  description: '',
  tags: [],
  images: [blob('boxes/three')],
  currentDiscount: 0,
  weight: 1200,
  inventory: 5,
  price: 999,
  books: 3,
};

const page = (docs: unknown[]) => ({
  docs,
  totalDocs: docs.length,
  limit: 10,
  totalPages: 1,
  page: 1,
  pagingCounter: 1,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
});
const ok = (data: unknown, status = 'LIST_SUCCESS') => ({ statusCode: 200, status, message: 'Success', data });

void describe('bookSchema', () => {
  void it('accepts a stored book with references as ids', () => {
    assert.ok(bookSchema.safeParse(book).success);
  });

  void it('accepts the detail response, with references populated as projections', () => {
    const populated = {
      ...book,
      author: { _id: id(2), authorId: 'AU-1', name: 'An Author', avatar: blob('authors/an-author') },
      categories: [{ _id: id(3), categoryId: 'CA-1', title: 'Fantasy' }],
      relatedBooks: [{ _id: id(12), title: 'Another', price: 299, author: { _id: id(2), name: 'An Author' } }],
      relatedBundles: [{ _id: id(5), title: 'Trilogy', bundledBooks: [id(1)] }],
      relatedCollections: [{ _id: id(4), title: 'Summer reads', books: [{ _id: id(1), title: 'A Book' }] }],
    };
    const result = bookDetailResponseSchema.safeParse(ok(populated, 'BOOK_LIST_SUCCESS'));
    assert.ok(result.success, JSON.stringify(result.error?.issues));
    const related = result.data.data.relatedBooks[0];
    assert.ok(typeof related === 'object' && typeof related.author === 'object' && related.author !== null);
    assert.equal(related.author.name, 'An Author');
  });

  void it('accepts legacy documents: no preOrder or message, null pages and weight', () => {
    const { preOrder: _preOrder, message: _message, ...legacy } = book;
    assert.ok(bookSchema.safeParse({ ...legacy, pages: null, weight: null }).success);
  });

  void it('drops supplier prices and soft-delete internals', () => {
    const parsed = bookSchema.parse({ ...book, wholeSalePriceHistory: [100], isDeleted: false, deletedAt: '', __v: 0 });
    for (const key of ['wholeSalePriceHistory', 'isDeleted', 'deletedAt', '__v']) assert.ok(!(key in parsed), key);
  });

  void it('rejects invalid values', () => {
    const cases: [string, unknown][] = [
      ['missing title', { ...book, title: undefined }],
      ['unknown type', { ...book, type: 'ebook' }],
      ['unknown availability', { ...book, availability: 'sold out' }],
      ['http poster', { ...book, poster: 'http://example.com/a.jpg' }],
      ['legacy file name poster', { ...book, poster: 'cover.jpg' }],
      ['negative stock', { ...book, inventory: -1 }],
      ['fraction of a paisa', { ...book, price: 10.555 }],
      ['discount over 100%', { ...book, currentDiscount: 120 }],
      ['date without time', { ...book, createdAt: '2023-04-05' }],
      ['populated reference without _id', { ...book, relatedBooks: [{ title: 'No id' }] }],
      ['malformed id reference', { ...book, categories: ['not-an-id'] }],
    ];
    for (const [name, value] of cases) assert.equal(bookSchema.safeParse(value).success, false, name);
  });

  void it('accepts the list response, author and categories populated', () => {
    const item = {
      _id: id(1),
      title: 'A Book',
      bookId: 'BK-0000000001',
      ISBN: '9780000000001',
      author: { _id: id(2), name: 'An Author', intro: '', avatar: blob('authors/an-author') },
      inventory: 0,
      poster: blob('covers/a-book'),
      images: [],
      tags: [],
      price: 499,
      weight: 300,
      popularity: 7,
      editorsPick: false,
      newRelease: true,
      currentDiscount: 0,
      bestSeller: false,
      categories: [{ _id: id(3), categoryId: 'CA-1', title: 'Fantasy' }],
    };
    assert.ok(bookListResponseSchema.safeParse(ok(page([item]))).success);
    assert.equal(bookListResponseSchema.safeParse(ok(page([{ ...item, price: undefined }]))).success, false);
  });
});

void describe('authorSchema', () => {
  void it('accepts ids and populated books', () => {
    assert.ok(authorSchema.safeParse(author).success);
    assert.ok(authorSchema.safeParse({ ...author, books: [{ _id: id(1), title: 'A Book', inventory: 3 }] }).success);
  });

  void it('rejects a missing avatar and a missing name', () => {
    assert.equal(authorSchema.safeParse({ ...author, avatar: '' }).success, false);
    assert.equal(authorSchema.safeParse({ ...author, name: undefined }).success, false);
  });

  void it('accepts the list projection', () => {
    const item = { _id: id(2), authorId: 'AU-1', name: 'An Author', popularity: 3, books: [id(1)], isDeleted: false };
    assert.ok(authorListResponseSchema.safeParse(ok(page([item]))).success);
  });
});

void describe('categorySchema and metaSchema', () => {
  void it('accepts a category with SEO meta', () => {
    assert.ok(categorySchema.safeParse(category).success);
  });

  void it('allows an empty SEO image but not a missing meta', () => {
    assert.ok(metaSchema.safeParse({ ...meta, imageUrl: '' }).success);
    assert.equal(metaSchema.safeParse({ ...meta, imageUrl: 'fantasy.png' }).success, false);
    assert.equal(categorySchema.safeParse({ ...category, meta: undefined }).success, false);
  });

  void it('accepts an empty, site-relative or https canonical url and rejects unsafe ones', () => {
    for (const url of ['', '/categories/fantasy', 'https://demo.pageaters.com/categories/fantasy']) {
      assert.ok(metaSchema.safeParse({ ...meta, url }).success, url);
    }
    for (const url of ['javascript:alert(1)', 'http://example.com', '//evil.example', 'categories/fantasy']) {
      assert.equal(metaSchema.safeParse({ ...meta, url }).success, false, url);
    }
  });

  void it('rejects a fractional book count', () => {
    assert.equal(categorySchema.safeParse({ ...category, numberOfBooks: 1.5 }).success, false);
  });
});

void describe('collectionSchema', () => {
  void it('accepts ids and populated references', () => {
    assert.ok(collectionSchema.safeParse(collection).success);
    const populated = {
      ...collection,
      books: [{ _id: id(1), title: 'A Book', author: id(2) }],
      featuredAuthors: [{ _id: id(2), name: 'An Author', books: [id(1)] }],
      relatedCollections: [{ _id: id(13), title: 'Winter reads', books: [{ _id: id(1), poster: blob('covers/a-book') }] }],
    };
    assert.ok(collectionSchema.safeParse(populated).success);
  });

  void it('accepts the list response, books populated with their author', () => {
    const item = {
      _id: id(4),
      collectionId: 'CO-1',
      title: 'Summer reads',
      tags: [],
      poster: blob('collections/summer'),
      priority: 0,
      popularity: 0,
      books: [{ _id: id(1), title: 'A Book', author: { _id: id(2), name: 'An Author' }, categories: [] }],
    };
    assert.ok(collectionListResponseSchema.safeParse(ok(page([item]))).success);
  });

  void it('rejects tags that are not strings', () => {
    assert.equal(collectionSchema.safeParse({ ...collection, tags: [1] }).success, false);
  });
});

void describe('bundleSchema', () => {
  void it('accepts a stored bundle and the detail response with its computed stock flag', () => {
    assert.ok(bundleSchema.safeParse(bundle).success);
    assert.ok(bundleSchema.safeParse({ ...bundle, inventory: 0, bundledBooks: [{ _id: id(1), inventory: 0 }] }).success);
  });

  void it('rejects a negative price', () => {
    assert.equal(bundleSchema.safeParse({ ...bundle, price: -1 }).success, false);
  });
});

void describe('productSetSchema', () => {
  void it('accepts ids and populated products', () => {
    assert.ok(productSetSchema.safeParse(productSet).success);
    const populated = {
      ...productSet,
      products: [{ _id: id(7), priority: 1, product: { _id: id(1), title: 'A Book', author: { _id: id(2), name: 'An Author' } } }],
    };
    assert.ok(productSetSchema.safeParse(populated).success);
  });

  void it('rejects an entry without its _id', () => {
    assert.equal(productSetSchema.safeParse({ ...productSet, products: [{ product: id(1), priority: 1 }] }).success, false);
  });

  void it('accepts a null product left by a hard delete', () => {
    assert.ok(productSetSchema.safeParse({ ...productSet, products: [{ _id: id(7), priority: 1, product: null }] }).success);
  });

  void it('does not take a flattened book for an entry', () => {
    const book = { _id: id(1), title: 'A Book', priority: 0, author: { _id: id(2), name: 'An Author' } };
    assert.equal(productSetSchema.safeParse({ ...productSet, products: [book] }).success, false);
  });
});

void describe('productSetDetailResponseSchema', () => {
  const flattened = {
    ...productSet,
    products: [{ _id: id(1), title: 'A Book', bookId: 'BK-1', price: 499, author: { _id: id(2), name: 'An Author' } }, null],
    categories: [{ _id: id(3), categoryId: 'CA-1', title: 'Fantasy', numberOfBooks: 1 }],
  };

  void it('accepts the slug/unique response: products flattened to their books', () => {
    const result = productSetDetailResponseSchema.safeParse(ok(flattened, 'PRODUCT_SET_LIST_SUCCESS'));
    assert.ok(result.success, JSON.stringify(result.error?.issues));
    const author = result.data.data.products[0]?.author;
    assert.ok(typeof author === 'object' && author !== null);
    assert.equal(author.name, 'An Author');
  });

  void it('rejects the stored entry shape and bare ids', () => {
    assert.equal(productSetDetailResponseSchema.safeParse(ok(productSet)).success, false);
    assert.equal(productSetDetailResponseSchema.safeParse(ok({ ...flattened, products: [id(1)] })).success, false);
  });
});

void describe('categoryProductsResponseSchema', () => {
  void it('accepts the category listing projection', () => {
    const item = {
      _id: id(1),
      title: 'A Book',
      bookId: 'BK-1',
      ISBN: '9780000000001',
      author: { _id: id(2), name: 'An Author', avatar: blob('authors/an-author') },
      poster: blob('covers/a-book'),
      price: 499,
      popularity: 7,
      availability: 'available',
      editorsPick: false,
      inventory: 3,
      currentDiscount: 0,
      newRelease: false,
      bestSeller: false,
      categories: [{ _id: id(3), categoryId: 'CA-1', title: 'Fantasy' }],
    };
    assert.ok(categoryProductsResponseSchema.safeParse(ok(page([item]))).success);
    assert.equal(categoryProductsResponseSchema.safeParse(ok(page([{ ...item, availability: 'gone' }]))).success, false);
  });
});

void describe('dealSchema', () => {
  void it('accepts ids and populated product sets down to the book author', () => {
    assert.ok(dealSchema.safeParse(deal).success);
    const populated = {
      ...deal,
      productSets: [
        {
          _id: id(9),
          priority: 1,
          set: {
            ...productSet,
            products: [{ _id: id(7), priority: 1, product: { _id: id(1), author: { _id: id(2), name: 'An Author' } } }],
          },
        },
      ],
    };
    const result = dealSchema.safeParse(populated);
    assert.ok(result.success, JSON.stringify(result.error?.issues));
  });

  void it('accepts the list projection and rejects a relative poster', () => {
    const item = { _id: id(8), dealId: 'DL-1', poster: blob('deals/sale'), ctaLink: '/sale', ctaText: 'Shop', title: 'Sale' };
    assert.ok(dealListResponseSchema.safeParse(ok(page([item]))).success);
    assert.equal(dealListResponseSchema.safeParse(ok(page([{ ...item, poster: '/sale.png' }]))).success, false);
  });

  void it('accepts the model defaults and a null set left by a hard delete', () => {
    const defaults = { ...deal, poster: '', ctaLink: '', productSets: [{ _id: id(9), priority: 1, set: null }] };
    assert.ok(dealSchema.safeParse(defaults).success);
  });

  void it('accepts only site paths and https URLs as ctaLink', () => {
    for (const ctaLink of ['/sets/new-releases', '/', 'https://demo.pageaters.com/sale']) {
      assert.ok(dealSchema.safeParse({ ...deal, ctaLink }).success, ctaLink);
    }
    const unsafe = [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,hi',
      'http://example.com',
      '//evil.example',
      '/\\evil.example',
      'sale',
      '/a b',
    ];
    for (const ctaLink of unsafe) assert.equal(dealSchema.safeParse({ ...deal, ctaLink }).success, false, ctaLink);
  });
});

void describe('addOnSchema', () => {
  void it('accepts an add-on and the grouped storefront response', () => {
    assert.ok(addOnSchema.safeParse(addOn).success);
    assert.ok(addOnGroupsResponseSchema.safeParse(ok([{ _id: 'bookmarks', addOns: [addOn] }])).success);
  });

  void it("accepts the model's empty poster but not a file name", () => {
    assert.ok(addOnSchema.safeParse({ ...addOn, poster: '' }).success);
    assert.equal(addOnSchema.safeParse({ ...addOn, poster: 'bookmark.jpg' }).success, false);
  });

  void it('rejects fractional stock', () => {
    assert.equal(addOnSchema.safeParse({ ...addOn, inventory: 0.5 }).success, false);
  });
});

void describe('mysteryBoxSchema', () => {
  void it('accepts a mystery box, including empty image entries (the model default)', () => {
    assert.ok(mysteryBoxSchema.safeParse(mysteryBox).success);
    assert.ok(mysteryBoxSchema.safeParse({ ...mysteryBox, images: [''] }).success);
  });

  void it('rejects a negative book count and non-URL images', () => {
    assert.equal(mysteryBoxSchema.safeParse({ ...mysteryBox, books: -1 }).success, false);
    assert.equal(mysteryBoxSchema.safeParse({ ...mysteryBox, images: ['box.jpg'] }).success, false);
  });
});
