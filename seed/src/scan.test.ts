import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluate, mask, scan, type Finding } from './scan.ts';

// node:test's describe/it return promises the runner tracks itself.

const kinds = (text: unknown) => scan('store-books', [{ _id: { $oid: 'a' }, tagline: text }]).map((f) => f.kind);
const finding = (overrides: Partial<Finding>): Finding => ({
  file: 'store-books',
  docId: 'a',
  path: 'description',
  kind: 'business-term',
  masked: 'vendor',
  ...overrides,
});

void describe('scan', () => {
  void it('flags mobile numbers in any grouping', () => {
    for (const text of [
      '9000000000',
      '90000 00000',
      '900 000 0000',
      '90-0000-0000',
      '9000.000.000',
      '+91 90000 00000',
      '+91-90-0000-0000',
      '+91 (90000) 00000',
      'tel9000000000',
      '90000/00000',
    ]) {
      assert.deepEqual(kinds(text), ['phone'], text);
    }
  });

  void it('flags landline and toll-free numbers', () => {
    for (const text of ['080-2345 6789', '022 23456789', '+91 80 4123 4567', '1800 123 4567']) {
      assert.deepEqual(kinds(text), ['phone'], text);
    }
  });

  void it('flags identity, card and bank numbers', () => {
    assert.deepEqual(kinds('id 1234 5678 9012'), ['aadhaar-or-card']);
    assert.deepEqual(kinds('card 4111 1111 1111 1111'), ['long-number']);
    assert.deepEqual(kinds('Acct 50100123456'), ['long-number']);
    assert.deepEqual(kinds(501001234567890), ['long-number']);
    for (const text of ['GSTIN 27ABCDE1234F1Z5', 'gstin 27abcde1234f1z5']) assert.ok(kinds(text).includes('gstin'), text);
    assert.deepEqual(kinds('pan abcde1234f'), ['pan']);
    assert.deepEqual(kinds('IFSC hdfc0001234'), ['ifsc']);
  });

  void it('flags emails and UPI IDs', () => {
    assert.deepEqual(kinds('mail jane.doe@example.org'), ['email']);
    assert.deepEqual(kinds('pay name@okhdfcbank'), ['upi']);
  });

  void it('leaves short numbers, years, prices and ISBNs alone', () => {
    assert.deepEqual(kinds('Published 2019-2020, 352 pages, ₹ 499'), []);
    assert.deepEqual(kinds('first edition ISBN 9780007559244, paperback ISBN: 0-7653-0553-X, ISBN 0-8125-7955-8, also 978-1728251400'), []);
  });

  void it('scans only the title slug of uploaded image names', () => {
    const image = (name: string) => scan('bundles', [{ _id: { $oid: 'a' }, poster: name }]).map((f) => f.kind);
    assert.deepEqual(image('harry-potter-bundle-Ab3dE5fG7h-1698765432101.webp'), []);
    assert.deepEqual(image('call-9000000000-Ab3dE5fG7h-1698765432101.webp'), ['phone']);
  });

  void it('flags the old store name in any form, plus links, handles and business terms', () => {
    assert.deepEqual(kinds('see https://pageaters.com/x'), ['brand', 'url']);
    assert.deepEqual(kinds('follow @pageaters'), ['brand', 'social-handle']);
    assert.deepEqual(kinds('pageaters.co.in'), ['brand']);
    assert.deepEqual(kinds('Fantasy Books | Pageaters'), []);
    assert.deepEqual(kinds('follow @someone'), ['social-handle']);
    assert.deepEqual(kinds('our Wholesale rate'), ['business-term']);
  });

  void it('skips identifiers with the expected shape and flags any other value', () => {
    const docs = [{ _id: { $oid: 'a' }, bookId: 'PEB-4123', ISBN: '9789390351602', createdAt: { $date: '2023-01-01' } }];
    assert.deepEqual(scan('store-books', docs), []);
    const odd = scan('store-books', [{ _id: { $oid: 'a' }, emailId: 'jane@example.org' }]).map((f) => f.kind);
    assert.deepEqual(odd, ['unexpected-identifier', 'email']);
  });

  void it('reports nested paths', () => {
    const [first] = scan('categories', [{ _id: { $oid: 'a' }, meta: { description: 'x@y.co' } }]);
    assert.equal(first?.path, 'meta.description');
  });
});

void describe('evaluate', () => {
  const reviewedTerms = [finding({ masked: 'vendor' }), finding({ masked: 'supplier' }), finding({ masked: 'call us' })];
  const authorLinks = [
    ...Array.from({ length: 17 }, () => finding({ file: 'authors', path: 'intro', kind: 'url' })),
    ...Array.from({ length: 24 }, () => finding({ file: 'authors', path: 'intro', kind: 'social-handle' })),
  ];

  void it('is clean when findings match the reviewed rules and counts', () => {
    assert.equal(evaluate([...reviewedTerms, ...authorLinks]).clean, true);
  });

  void it('flags a term the rule did not review', () => {
    const result = evaluate([...reviewedTerms, ...authorLinks, finding({ masked: 'whatsapp' })]);
    assert.equal(result.clean, false);
    assert.deepEqual(
      result.flagged.map((f) => f.masked),
      ['whatsapp'],
    );
  });

  void it('fails when a reviewed count changes', () => {
    assert.equal(evaluate([...reviewedTerms, ...authorLinks.slice(1)]).clean, false);
  });

  void it('never accepts the brand, even in a reviewed field', () => {
    const result = evaluate([...reviewedTerms, ...authorLinks, finding({ file: 'authors', path: 'intro', kind: 'brand' })]);
    assert.equal(result.flagged.length, 1);
  });
});

void describe('mask', () => {
  void it('keeps two characters, or the host of a link without credentials', () => {
    assert.equal(mask('email', 'ab@cd.ef'), 'ab******');
    assert.equal(mask('url', 'https://example.org/path?q=1'), 'example.org/…');
    assert.equal(mask('url', 'https://user:secret@example.org/x'), 'example.org/…');
  });
});
