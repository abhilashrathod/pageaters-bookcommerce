import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertPathTemplate, buildUrl, fillPath, pathParamNames, serialiseQuery } from './url.ts';
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

  void it('rejects a path that does not start with a single slash, so it cannot change the host', () => {
    for (const path of ['.evil.test/x', '@evil.test/x', 'categories', '//evil.test/x', '/\\evil.test/x', '']) {
      assert.throws(() => buildUrl('https://api.demo.example.test', path), TypeError, path);
      assert.throws(() => buildUrl('https://api.example.test/api/v1', path), TypeError, path);
    }
  });

  void it('rejects a path that resolves outside the base path', () => {
    for (const path of ['/../x', '/%2e%2e/x', '/./../../x']) {
      assert.throws(() => buildUrl('https://api.example.test/api/v1', path), TypeError, path);
      assert.throws(() => buildUrl('/api/v1', path), TypeError, path);
    }
    assert.equal(buildUrl('https://api.example.test', '/x'), 'https://api.example.test/x');
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

  void it('rejects dot segments and non-finite numbers, which would reach another route', () => {
    for (const id of ['.', '..', Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.throws(() => fillPath('/categories/unique/:id', { id }), TypeError, String(id));
    }
    assert.equal(fillPath('/categories/unique/:id', { id: '...' }), '/categories/unique/...');
    assert.equal(fillPath('/categories/unique/:id', { id: 0 }), '/categories/unique/0');
  });

  void it('lists the template params', () => {
    assert.deepEqual(pathParamNames('/cart/:cartId/item/:itemId'), ['cartId', 'itemId']);
    assert.deepEqual(pathParamNames('/categories'), []);
  });

  void it('accepts only whole-segment `:name` params in templates', () => {
    assertPathTemplate('/cart/:cartId/item/:item_id2');
    for (const path of ['/a/:id.json', '/a/:id?', '/a/x:id', '/a/:', '/a/:id-x', 'a/:id', '//a']) {
      assert.throws(() => assertPathTemplate(path), TypeError, path);
    }
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
