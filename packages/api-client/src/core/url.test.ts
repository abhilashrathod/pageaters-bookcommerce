import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildUrl, fillPath, pathParamNames, serialiseQuery } from './url.ts';
import type { PathParamNames } from './url.ts';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _none: Same<PathParamNames<'/categories'>, never> = true;
const _one: Same<PathParamNames<'/categories/unique/:id'>, 'id'> = true;
const _middle: Same<PathParamNames<'/categories/:id/products'>, 'id'> = true;
const _two: Same<PathParamNames<'/cart/:cartId/item/:itemId'>, 'cartId' | 'itemId'> = true;

void describe('buildUrl', () => {
  void it('joins the base and the path whether or not the base ends with a slash', () => {
    assert.equal(buildUrl('https://api.example.test/api/v1', '/categories'), 'https://api.example.test/api/v1/categories');
    assert.equal(buildUrl('https://api.example.test/api/v1/', '/categories'), 'https://api.example.test/api/v1/categories');
    assert.equal(buildUrl('https://api.example.test/api/v1//', '/categories'), 'https://api.example.test/api/v1/categories');
  });

  void it('keeps a relative base for same-origin proxies', () => {
    assert.equal(buildUrl('/api/v1', '/categories', { page: 2 }), '/api/v1/categories?page=2');
  });
});

void describe('fillPath', () => {
  void it('URI-encodes each value', () => {
    assert.equal(fillPath('/categories/search/:q', { q: 'a/b c?&#' }), '/categories/search/a%2Fb%20c%3F%26%23');
    assert.equal(fillPath('/cart/:cartId/item/:itemId', { cartId: 'c1', itemId: 7 }), '/cart/c1/item/7');
  });

  void it('rejects a missing or empty value instead of hitting another route', () => {
    assert.throws(() => fillPath('/categories/unique/:id', {}), TypeError);
    assert.throws(() => fillPath('/categories/unique/:id', { id: '' }), TypeError);
    assert.throws(() => fillPath('/categories/unique/:id', { id: null }), TypeError);
  });

  void it('lists the template params', () => {
    assert.deepEqual(pathParamNames('/cart/:cartId/item/:itemId'), ['cartId', 'itemId']);
    assert.deepEqual(pathParamNames('/categories'), []);
  });
});

void describe('serialiseQuery', () => {
  void it('skips undefined and null, and stringifies numbers and booleans', () => {
    assert.equal(
      serialiseQuery({ page: 1, limit: undefined, sortBy: null, preOrder: true, q: 'two words' }),
      '?page=1&preOrder=true&q=two+words',
    );
  });

  void it('sends arrays as repeated keys, which Express parses back into an array', () => {
    assert.equal(serialiseQuery({ categories: ['a', 'b,c'] }), '?categories=a&categories=b%2Cc');
    assert.equal(serialiseQuery({ categories: [] }), '');
  });

  void it('keeps empty strings, which the shared query schemas treat as unset', () => {
    assert.equal(serialiseQuery({ sortBy: '' }), '?sortBy=');
  });

  void it('returns nothing for an empty or absent query', () => {
    assert.equal(serialiseQuery(undefined), '');
    assert.equal(serialiseQuery({}), '');
  });
});
