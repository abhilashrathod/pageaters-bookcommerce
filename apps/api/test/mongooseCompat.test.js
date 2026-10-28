const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

require('../src/helpers/mongooseCompat.helper');

// No database needed: queries are only built, never executed.
const Thing = mongoose.model('CompatSortThing', new mongoose.Schema({ title: String, score: Number }));

const sortOf = (sort) => Thing.find().sort(sort).getOptions().sort;

describe('legacy sort values (Mongoose 5 rules)', () => {
  const cases = [
    ['-1', -1],
    [['-1'], -1],
    ['DESC', -1],
    ['descending', -1],
    ['asc', 1],
    ['1', 1],
    [undefined, 1],
    [NaN, 1],
    [-1, -1],
    [1, 1],
  ];

  for (const [value, expected] of cases) {
    test(`${JSON.stringify(value) ?? String(value)} sorts ${expected}`, () => {
      assert.deepEqual(sortOf({ title: value }), { title: expected });
    });
  }

  test('$meta sort objects are left untouched', () => {
    assert.deepEqual(sortOf({ score: { $meta: 'textScore' } }), { score: { $meta: 'textScore' } });
  });

  test('values Mongoose 5 rejected still throw', () => {
    assert.throws(() => sortOf({ title: 'sideways' }), /Invalid sort value/);
    assert.throws(() => sortOf({ title: ['-1', '1'] }), /Invalid sort value/);
  });

  test('string sort syntax is unchanged', () => {
    assert.deepEqual(sortOf('-score title'), { score: -1, title: 1 });
  });
});

describe('legacy paginate limit (mongoose-paginate-v2 1.7 rules)', () => {
  const schema = new mongoose.Schema({ title: String });
  let received;
  schema.statics.paginate = function paginate(query, options) {
    received = options;
    return Promise.resolve();
  };
  const Paged = mongoose.model('CompatPaginateThing', schema);

  test('a limit key that is not a number becomes 0', async () => {
    await Paged.paginate({}, { page: 1, limit: undefined });
    assert.equal(received.limit, 0);
    await Paged.paginate({}, { page: 1, limit: 'abc' });
    assert.equal(received.limit, 0);
  });

  test('an absent limit key and numeric limits pass through', async () => {
    await Paged.paginate({}, { page: 1 });
    assert.equal(Object.hasOwn(received, 'limit'), false);
    await Paged.paginate({}, { page: 1, limit: '20' });
    assert.equal(received.limit, '20');
  });
});
