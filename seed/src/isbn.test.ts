import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidIsbn, normaliseIsbn } from './isbn.ts';

// node:test's describe/it return promises the runner tracks itself.

void describe('normaliseIsbn', () => {
  void it('strips hyphens, whitespace and invisible marks', () => {
    assert.equal(normaliseIsbn('‎ 978-0-7475-3274-3 '), '9780747532743');
    assert.equal(normaliseIsbn('978 0747532743'), '9780747532743');
    assert.equal(normaliseIsbn('0-8044-2957-x'), '080442957X');
  });

  void it('keeps the first of several ISBNs', () => {
    assert.equal(normaliseIsbn('978-0747532743   978-0747538493  978-0747542155'), '9780747532743');
  });

  void it('turns placeholders into an empty string', () => {
    assert.equal(normaliseIsbn('n/a'), '');
    assert.equal(normaliseIsbn(''), '');
  });
});

void describe('isValidIsbn', () => {
  void it('checks ISBN-13 and ISBN-10 check digits', () => {
    assert.equal(isValidIsbn('9780747532743'), true);
    assert.equal(isValidIsbn('9780747532744'), false);
    assert.equal(isValidIsbn('080442957X'), true);
    assert.equal(isValidIsbn('0804429571'), false);
  });

  void it('rejects other lengths', () => {
    assert.equal(isValidIsbn('978074753274'), false);
    assert.equal(isValidIsbn(''), false);
  });
});
