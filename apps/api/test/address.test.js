const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { asCreated, asJson, assertBody, assertGuarded, createUser, envelopes, startTestApp } = require('./helpers');
const shipping = require('../src/adapters/shipping');
const { addressFields } = require('./helpers/fixtures/store');
const t = require('../src/locales/en.json');
const { shopperAddressResponseSchema, shopperPincodeServiceabilityResponseSchema } = require('@pageaters/shared');

// /api/v1/addresses over HTTP: a shopper's delivery addresses and the pincode serviceability check (the mock
// shipping adapter: every well-formed pincode is serviceable except 999000 and 999999). Written against the legacy
// controller before the service refactor.

const { ok, okString, badRequest, badRequestObject, serverError } = envelopes;

const Address = () => mongoose.model('address');

let api;
let shopper;

const courierCalls = () => shipping.list().filter((call) => call.type === 'pincode');

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  shopper = await createUser();
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
    assert.deepEqual(courierCalls(), [{ type: 'pincode', pincode: '999001' }]);
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

  test('legacy: a courier failure counts as unserviceable', async (t) => {
    t.mock.method(shipping, 'checkPincode', async () => {
      throw Object.assign(new Error('Shipping request failed'), { status: 503 });
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

  test('sets only the fields sent: the others, the email included, stay as they were', async () => {
    const mine = await insertAddress(shopper.user, { landmark: 'Test Landmark' });
    const res = await api.request(`/addresses/${mine._id}`, { method: 'PUT', body: { city: 'Only City' }, cookie: shopper.cookie });
    const updated = await Address().findById(mine._id);
    assertBody(res, 200, ok('ADDRESS_UPDATE_SUCCESS', asJson(updated)));
    assert.deepEqual(
      [updated.city, updated.email, updated.landmark, updated.fullName, updated.pinCode],
      ['Only City', 'receiver@example.com', 'Test Landmark', 'Test Receiver', '999001'],
    );
    assert.ok(shopperAddressResponseSchema.safeParse(res.body).success);
  });

  test('never sets the owner, the deleted flag or the country, whatever the body says', async () => {
    const other = await createUser();
    const mine = await insertAddress(shopper.user);
    const body = { userId: String(other.user._id), isDeleted: true, deletedAt: 'now', country: 'US', city: 'New City' };
    assert.equal((await api.request(`/addresses/${mine._id}`, { method: 'PUT', body, cookie: shopper.cookie })).status, 200);
    const updated = await Address().findById(mine._id);
    assert.deepEqual([String(updated.userId), updated.isDeleted, updated.deletedAt, updated.country, updated.city], [String(shopper.user._id), false, '', 'IN', 'New City']);
  });

  test("another user's, a deleted or an unknown address answers ADDRESS_NOT_EXIST and nothing changes", async () => {
    const other = await createUser();
    const theirs = await insertAddress(other.user, { isDefault: true });
    const deleted = await insertAddress(shopper.user, { isDeleted: true });
    const unknown = new mongoose.Types.ObjectId();
    for (const id of [theirs._id, deleted._id, unknown]) {
      const res = await api.request(`/addresses/${id}`, { method: 'PUT', body: { city: 'Hacked', isDefault: true }, cookie: shopper.cookie });
      assertBody(res, 400, badRequest('ADDRESS_NOT_EXIST'));
    }
    const after = await Address().findById(theirs._id);
    assert.deepEqual([after.city, after.isDefault], ['Test City', true]);
    assert.equal((await Address().findById(deleted._id)).city, 'Test City');
  });

  test('a new pincode must be serviceable; an unchanged one is not re-checked', async () => {
    const mine = await insertAddress(shopper.user);
    const put = (body) => api.request(`/addresses/${mine._id}`, { method: 'PUT', body, cookie: shopper.cookie });
    assertBody(await put({ pinCode: '999000', city: 'New City' }), 400, badRequestObject('PINCODE_ERROR'));
    assert.deepEqual([(await Address().findById(mine._id)).pinCode, (await Address().findById(mine._id)).city], ['999001', 'Test City']);

    shipping.clear();
    assert.equal((await put({ pinCode: '999001' })).status, 200);
    assert.deepEqual(courierCalls(), []);
    assert.equal((await put({ pinCode: '999002' })).status, 200);
    assert.equal(courierCalls().length, 1);
    assert.equal((await Address().findById(mine._id)).pinCode, '999002');
  });

  test('a failed update keeps the existing default (the others are cleared only after the update)', async (t) => {
    const first = await insertAddress(shopper.user, { isDefault: true });
    const second = await insertAddress(shopper.user);
    t.mock.method(Address(), 'findOneAndUpdate', async () => {
      throw new Error('write failed');
    });
    const res = await api.request(`/addresses/${second._id}`, { method: 'PUT', body: { isDefault: true }, cookie: shopper.cookie });
    assertBody(res, 500, serverError);
    assert.deepEqual([(await Address().findById(first._id)).isDefault, (await Address().findById(second._id)).isDefault], [true, false]);
  });

  test('an address deleted while the update runs answers ADDRESS_NOT_EXIST and clears no default', async (t) => {
    const first = await insertAddress(shopper.user, { isDefault: true });
    const second = await insertAddress(shopper.user);
    const model = Address();
    const original = model.findOneAndUpdate;
    // The race: the address is soft-deleted after the ownership check, right before the update.
    t.mock.method(model, 'findOneAndUpdate', async function (...args) {
      await model.updateOne({ _id: second._id }, { isDeleted: true });
      return original.apply(this, args);
    });
    const res = await api.request(`/addresses/${second._id}`, { method: 'PUT', body: { isDefault: true }, cookie: shopper.cookie });
    assertBody(res, 400, badRequest('ADDRESS_NOT_EXIST'));
    assert.equal((await Address().findById(first._id)).isDefault, true);
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
  test('answers the summary only, never the courier’s raw record', async () => {
    const res = await api.request('/addresses/check-pincode/999001');
    assertBody(res, 200, ok('PINCODE_SUCCESS', { main: { serviceable: true, isCod: 'Y', isPrepaid: 'Y', district: 'Mock District', state: 'MK' } }));
    assert.ok(shopperPincodeServiceabilityResponseSchema.safeParse(res.body).success);
  });

  test('an unserviceable pincode answers the object-form 400', async () => {
    assertBody(await api.request('/addresses/check-pincode/999000'), 400, badRequestObject('PINCODE_ERROR'));
  });

  test('a courier failure answers 500', async (t) => {
    t.mock.method(shipping, 'checkPincode', async () => {
      throw Object.assign(new Error('Shipping request failed'), { status: 503 });
    });
    assertBody(await api.request('/addresses/check-pincode/999001'), 500, serverError);
  });
});
