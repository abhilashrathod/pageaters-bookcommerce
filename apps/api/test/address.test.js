const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, mockVendorCall, startTestApp } = require('./helpers');
const { addressFields } = require('./helpers/fixtures/store');
const t = require('../src/locales/en.json');

// /api/v1/addresses over HTTP: a shopper's delivery addresses and the pincode serviceability check (Delhivery,
// mocked). Written against the legacy controller before the service refactor.

const { ok, okString, badRequest, badRequestObject, serverError } = envelopes;

const Address = () => mongoose.model('address');

const PINCODE_RECORD = { postal_code: { pin: 999001, cod: 'Y', pre_paid: 'Y', district: 'Test District', state_code: 'TS' } };

let api;
let shopper;
let courierCalls;

// Delhivery answers every pincode except 999000 as serviceable.
const mockCourier = () => {
  courierCalls = [];
  mockVendorCall('axios', (config) => {
    courierCalls.push(config);
    const serviceable = !config.url.includes('filter_codes=999000');
    return { data: { delivery_codes: serviceable ? [PINCODE_RECORD] : [] } };
  });
};

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  shopper = await createUser();
  mockCourier();
});

const create = (body, cookie = shopper.cookie) => api.request('/addresses', { method: 'POST', body, cookie });
const insertAddress = async (user, overrides) => {
  const { _id } = await Address().create({ userId: user._id, ...addressFields(overrides) });
  return Address().findById(_id);
};

describe('auth', () => {
  test('every address route needs a session', async () => {
    const id = String(new mongoose.Types.ObjectId());
    for (const route of [
      ['GET', '/addresses'],
      ['GET', `/addresses/${id}`],
      ['POST', '/addresses', addressFields()],
      ['PUT', `/addresses/${id}`, {}],
      ['DELETE', `/addresses/${id}`],
      ['PATCH', `/addresses/${id}`],
    ]) {
      await assertGuarded(api, route);
    }
  });

  test('the pincode check is public', async () => {
    assert.equal((await api.request('/addresses/check-pincode/999001')).status, 200);
  });
});

describe('POST /addresses', () => {
  test('creates a serviceable address for the caller', async () => {
    const res = await create(addressFields({ isDefault: true }));
    const [address] = await Address().find({ userId: shopper.user._id });
    assertBody(res, 200, ok('ADDRESS_CREATE_SUCCESS', asCreated(address)));
    assert.equal(address.isDefault, true);
    assert.equal(courierCalls.length, 1);
    assert.match(courierCalls[0].url, /filter_codes=999001/);
  });

  test('a new default address clears the previous default', async () => {
    await create(addressFields({ isDefault: true }));
    await create(addressFields({ isDefault: true, addressLine1: '2 Test Street' }));
    const addresses = await Address().find({ userId: shopper.user._id }).sort({ createdAt: 1, _id: 1 });
    assert.deepEqual(addresses.map((a) => a.isDefault), [false, true]);
  });

  test('the validator requires an email, so the account-email fallback never applies on create', async () => {
    const { email, ...fields } = addressFields();
    assert.ok(email);
    for (const body of [fields, { ...fields, email: '' }]) {
      assertBody(await create(body), 400, badRequestObject('INVALID_EMAIL'));
    }
  });

  test('refuses an unserviceable pincode with the object-form 400', async () => {
    assertBody(await create(addressFields({ pinCode: '999000' })), 400, badRequestObject('PINCODE_ERROR'));
    assert.equal(await Address().countDocuments(), 0);
  });

  test('legacy: a courier failure counts as unserviceable', async () => {
    mockVendorCall('axios', () => {
      throw new Error('courier down');
    });
    assertBody(await create(addressFields()), 400, badRequestObject('PINCODE_ERROR'));
  });

  test('validates the payload before auth', async () => {
    const res = await api.request('/addresses', { method: 'POST', body: addressFields({ contactNo: '12' }) });
    assertBody(res, 400, { statusCode: 400, status: 'INVALID_PHONE', message: t.INVALID_PHONE, error: t.INVALID_PHONE, data: {} });
  });
});

describe('GET /addresses and /addresses/:id', () => {
  test("lists only the caller's live addresses", async () => {
    const other = await createUser();
    const mine = await insertAddress(shopper.user);
    await insertAddress(shopper.user, { isDeleted: true });
    await insertAddress(other.user);
    assertBody(await api.request('/addresses', { cookie: shopper.cookie }), 200, ok('ADDRESS_LIST_SUCCESS', [asJson(mine)]));
  });

  test("answers one of the caller's addresses", async () => {
    const mine = await insertAddress(shopper.user);
    const other = await createUser();
    const theirs = await insertAddress(other.user);
    assertBody(await api.request(`/addresses/${mine._id}`, { cookie: shopper.cookie }), 200, ok('ADDRESS_LIST_SUCCESS', asJson(mine)));
    assertBody(await api.request(`/addresses/${theirs._id}`, { cookie: shopper.cookie }), 400, badRequest('ADDRESS_NOT_EXIST'));
  });

  test('refuses a malformed id before auth', async () => {
    assertBody(await api.request('/addresses/not-an-id'), 400, badRequestObject('INVALID_ID'));
  });
});

describe('PUT /addresses/:id', () => {
  test('updates the address and returns it', async () => {
    const mine = await insertAddress(shopper.user);
    const res = await api.request(`/addresses/${mine._id}`, { method: 'PUT', body: addressFields({ city: 'Other Test City' }), cookie: shopper.cookie });
    const updated = await Address().findById(mine._id);
    assertBody(res, 200, ok('ADDRESS_UPDATE_SUCCESS', asJson(updated)));
    assert.equal(updated.city, 'Other Test City');
  });

  test('legacy: no validator; fields left out stay as they were and email falls back to the account', async () => {
    const mine = await insertAddress(shopper.user, { landmark: 'Test Landmark' });
    await api.request(`/addresses/${mine._id}`, { method: 'PUT', body: { city: 'Only City' }, cookie: shopper.cookie });
    const updated = asJson(await Address().findById(mine._id));
    assert.equal(updated.city, 'Only City');
    assert.equal(updated.email, shopper.user.email);
    assert.equal(updated.landmark, 'Test Landmark');
    assert.equal(updated.fullName, 'Test Receiver');
  });

  test("legacy: another user's address answers success with data null and is not changed", async () => {
    const other = await createUser();
    const theirs = await insertAddress(other.user);
    assertBody(await api.request(`/addresses/${theirs._id}`, { method: 'PUT', body: { city: 'Hacked' }, cookie: shopper.cookie }), 200, ok('ADDRESS_UPDATE_SUCCESS', null));
    assert.equal((await Address().findById(theirs._id)).city, 'Test City');
  });

  test('legacy: the existence check is an unfiltered findOne, so ADDRESS_NOT_EXIST only when no address exists at all', async () => {
    const id = new mongoose.Types.ObjectId();
    assertBody(await api.request(`/addresses/${id}`, { method: 'PUT', body: {}, cookie: shopper.cookie }), 400, badRequest('ADDRESS_NOT_EXIST'));
  });

  test('isDefault clears the other defaults', async () => {
    const first = await insertAddress(shopper.user, { isDefault: true });
    const second = await insertAddress(shopper.user);
    await api.request(`/addresses/${second._id}`, { method: 'PUT', body: addressFields({ isDefault: true }), cookie: shopper.cookie });
    assert.equal((await Address().findById(first._id)).isDefault, false);
    assert.equal((await Address().findById(second._id)).isDefault, true);
  });
});

describe('PATCH /addresses/:id (make default)', () => {
  test('makes one address the default', async () => {
    const first = await insertAddress(shopper.user, { isDefault: true });
    const second = await insertAddress(shopper.user);
    const res = await api.request(`/addresses/${second._id}`, { method: 'PATCH', cookie: shopper.cookie });
    assertBody(res, 200, ok('ADDRESS_UPDATE_SUCCESS', asJson(await Address().findById(second._id))));
    assert.equal((await Address().findById(first._id)).isDefault, false);
    assert.equal((await Address().findById(second._id)).isDefault, true);
  });

  test("refuses another user's or a deleted address", async () => {
    const other = await createUser();
    const theirs = await insertAddress(other.user);
    const deleted = await insertAddress(shopper.user, { isDeleted: true });
    for (const address of [theirs, deleted]) {
      assertBody(await api.request(`/addresses/${address._id}`, { method: 'PATCH', cookie: shopper.cookie }), 400, badRequest('ADDRESS_NOT_EXIST'));
    }
  });
});

describe('DELETE /addresses/:id', () => {
  test('soft-deletes the address', async () => {
    const mine = await insertAddress(shopper.user);
    assertBody(await api.request(`/addresses/${mine._id}`, { method: 'DELETE', cookie: shopper.cookie }), 200, okString('ADDRESS_DELETE_SUCCESS'));
    const deleted = await Address().findById(mine._id);
    assert.equal(deleted.isDeleted, true);
    assert.ok(deleted.deletedAt);
    assertBody(await api.request(`/addresses/${mine._id}`, { method: 'DELETE', cookie: shopper.cookie }), 400, badRequest('ADDRESS_NOT_EXIST'));
  });

  test("refuses another user's address", async () => {
    const other = await createUser();
    const theirs = await insertAddress(other.user);
    assertBody(await api.request(`/addresses/${theirs._id}`, { method: 'DELETE', cookie: shopper.cookie }), 400, badRequest('ADDRESS_NOT_EXIST'));
    assert.equal((await Address().findById(theirs._id)).isDeleted, false);
  });
});

describe('GET /addresses/check-pincode/:pincode', () => {
  test('legacy: answers the summary and the courier’s raw record', async () => {
    assertBody(
      await api.request('/addresses/check-pincode/999001'),
      200,
      ok('PINCODE_SUCCESS', { main: { serviceable: true, isCod: 'Y', isPrepaid: 'Y', district: 'Test District', state: 'TS' }, raw: PINCODE_RECORD }),
    );
  });

  test('an unserviceable pincode answers the object-form 400', async () => {
    assertBody(await api.request('/addresses/check-pincode/999000'), 400, badRequestObject('PINCODE_ERROR'));
  });

  test('a courier failure answers 500', async () => {
    mockVendorCall('axios', () => {
      throw new Error('courier down');
    });
    assertBody(await api.request('/addresses/check-pincode/999001'), 500, serverError);
  });
});
