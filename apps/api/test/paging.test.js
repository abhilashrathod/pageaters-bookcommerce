const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

require('./helpers');
const { pageOptions, parsePaging, sortOn } = require('../src/helpers/paging.helper');

// helpers/paging.helper.js: the list-query defaults every catalog list uses (Phase 4 legacy bugs: lists without
// page/limit answered no documents and `page: null`, and sorted on `undefined` or NaN).

const codeOf = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.code;
  }
  return undefined;
};

describe('pageOptions', () => {
  test('defaults to page 1 of 10, newest first, with an _id tiebreak', () => {
    assert.deepEqual(pageOptions({}), { page: 1, limit: 10, sort: { createdAt: -1, _id: -1 } });
    assert.deepEqual(pageOptions(), { page: 1, limit: 10, sort: { createdAt: -1, _id: -1 } });
    // The admin sends every key; '' counts as missing.
    assert.deepEqual(pageOptions({ page: '', limit: '', sortBy: '', sortOrder: '' }), { page: 1, limit: 10, sort: { createdAt: -1, _id: -1 } });
  });

  test('coerces the query strings and takes asc/desc/1/-1 alike', () => {
    for (const [sortOrder, order] of [
      ['asc', 1],
      ['1', 1],
      [1, 1],
      ['desc', -1],
      ['-1', -1],
      [-1, -1],
    ]) {
      assert.deepEqual(pageOptions({ page: '3', limit: '25', sortBy: 'title', sortOrder }, { sortable: ['title'] }), { page: 3, limit: 25, sort: { title: order, _id: order } });
    }
  });

  test('takes per-endpoint defaults', () => {
    assert.deepEqual(pageOptions({}, { sortBy: 'priority', sortOrder: 1 }), { page: 1, limit: 10, sort: { priority: 1, _id: 1 } });
    assert.deepEqual(pageOptions({ sortOrder: 'desc' }, { sortBy: 'priority', sortOrder: 1 }), { page: 1, limit: 10, sort: { priority: -1, _id: -1 } });
  });

  test('allows only the listed sort fields (and the default)', () => {
    assert.equal(codeOf(() => pageOptions({ sortBy: 'price' }, { sortable: ['title'] })), 'SORTING_NOT_ALLOWED');
    assert.equal(codeOf(() => pageOptions({ sortBy: 'title' })), 'SORTING_NOT_ALLOWED');
    assert.equal(codeOf(() => pageOptions({ sortBy: ['title'] }, { sortable: ['title'] })), 'SORTING_NOT_ALLOWED');
    assert.equal(codeOf(() => pageOptions({ sortBy: { $gt: '' } }, { sortable: ['title'] })), 'SORTING_NOT_ALLOWED');
    assert.deepEqual(pageOptions({ sortBy: 'createdAt', sortOrder: 'asc' }).sort, { createdAt: 1, _id: 1 });
  });

  test('refuses a page, limit or order out of range', () => {
    for (const params of [{ page: '0' }, { page: 'x' }, { page: '1.5' }, { limit: '0' }, { limit: '1001' }, { limit: { $gt: 0 } }, { sortOrder: 'up' }, { sortOrder: '0' }]) {
      assert.equal(codeOf(() => pageOptions(params)), 'INVALID_PAGING', JSON.stringify(params));
    }
    assert.equal(pageOptions({ limit: '1000' }).limit, 1000);
  });
});

describe('parsePaging and sortOn', () => {
  test('parsePaging answers the checked values; sortOn adds no second _id', () => {
    assert.deepEqual(parsePaging({ limit: '5', sortOrder: 'asc' }), { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 1 });
    assert.deepEqual(sortOn('_id', 1), { _id: 1 });
    assert.deepEqual(sortOn('popularity', -1), { popularity: -1, _id: -1 });
  });
});
