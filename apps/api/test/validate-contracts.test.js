const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, createUser, envelopes, mockVendorCall, startTestApp } = require('./helpers');
const { addressFields } = require('./helpers/fixtures/store');
const { createAddress, createOrder } = require('./helpers/fixtures/orders');

// The request contracts Phase 4 tightened while replacing Joi (each was accepted before). Validation failures answer
// the object-form 400 (`message` before `error`).

const { badRequest } = envelopes;
const invalid = envelopes.badRequestObject;

const User = () => mongoose.model('user');
const Subscriber = () => mongoose.model('subscriber');
const Address = () => mongoose.model('address');
const Order = () => mongoose.model('order');

let api;
let shopper;
let courierCalls;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  shopper = await createUser();
  courierCalls = [];
  mockVendorCall('axios', (config) => {
    courierCalls.push(config);
    return { data: { delivery_codes: [{ postal_code: { pin: 999001, cod: 'Y', pre_paid: 'Y' } }] } };
  });
});

const post = (path, body, cookie) => api.request(path, { method: 'POST', body, cookie });
const register = (email, password) => post('/auth/register', { email, password });
const login = (email, password) => post('/auth/login', { email, password });

describe('unknown query keys', () => {
  test('are ignored, so a cache-buster no longer answers 400', async () => {
    assertBody(await post('/auth/login?_=1700000000', { email: 'nobody@example.com', password: 'x' }), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    assert.equal((await api.request(`/favorites/${new mongoose.Types.ObjectId()}?v=2`, { cookie: shopper.cookie })).status, 200);
  });

  test('unknown body keys are still refused, also when the query repeats them', async () => {
    const res = await post('/auth/login?role=ADMIN', { email: 'nobody@example.com', password: 'x', role: 'ADMIN' });
    assertBody(res, 400, invalid('INVALID_REQUEST'));
  });

  test('a 400 never echoes a client-chosen key name or the schema text', async () => {
    const res = await post('/auth/login', { email: 'nobody@example.com', password: 'x', '<script>evil</script>': 1 });
    assertBody(res, 400, invalid('INVALID_REQUEST'));
    assert.ok(!JSON.stringify(res.body).includes('evil'));
  });

  test('known keys in the query are still checked', async () => {
    assertBody(await post('/auth/login?email=nope', { password: 'x' }), 400, invalid('INVALID_EMAIL'));
  });
});

describe('emails', () => {
  test('are trimmed and lower-cased: one account per address, whatever the case', async () => {
    assert.equal((await register(' Test.Shopper@Example.COM ', 'test-password-1')).status, 200);
    assert.equal(await User().countDocuments({ email: 'test.shopper@example.com' }), 1);
    assertBody(await register('test.shopper@example.com', 'test-password-1'), 400, badRequest('USER_ALREADY_REGISTERED'));
    assert.equal((await login('TEST.SHOPPER@example.com', 'test-password-1')).status, 200);
  });

  test('a subscriber is stored lower-cased', async () => {
    assert.equal((await post('/subscribers', { email: 'News.Reader@Example.com' })).status, 200);
    assert.equal(await Subscriber().countDocuments({ email: 'news.reader@example.com' }), 1);
  });
});

describe('passwords', () => {
  test('are never trimmed: the spaces are part of the password', async () => {
    assert.equal((await register('spaces@example.com', '  pass word  ')).status, 200);
    assertBody(await login('spaces@example.com', 'pass word'), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
    assert.equal((await login('spaces@example.com', '  pass word  ')).status, 200);
  });

  test('are capped at 128 characters as sent (and 50 after trimming)', async () => {
    assert.equal((await register('padded@example.com', `${' '.repeat(127)}x`)).status, 200);
    assertBody(await register('long@example.com', `${' '.repeat(128)}x`), 400, invalid('INVALID_PASSWORD'));
    assertBody(await login('padded@example.com', 'p'.repeat(129)), 400, invalid('INVALID_PASSWORD'));
    assertBody(await api.request('/auth/me', { method: 'DELETE', body: { password: 'p'.repeat(129) }, cookie: shopper.cookie }), 400, invalid('INVALID_PASSWORD'));
  });
});

describe('tokens', () => {
  test('verify and reset tokens are at most 1024 characters', async () => {
    const token = 'a'.repeat(1025);
    assertBody(await post('/auth/verify-email', { email: shopper.user.email, token }), 400, invalid('INVALID_TOKEN'));
    const reset = { email: shopper.user.email, token, newPassword: 'test-password-2', confirmPassword: 'test-password-2' };
    assertBody(await post('/auth/reset-password', reset), 400, invalid('INVALID_RESET_PASSWORD_TOKEN'));
    assertBody(await post('/auth/logout', { token }, shopper.cookie), 400, invalid('INVALID_TOKEN'));
  });
});

describe('addresses', () => {
  const create = (overrides) => post('/addresses', addressFields(overrides), shopper.cookie);

  test('the pin code is six digits', async () => {
    for (const pinCode of ['99900', '9990011', 'abcdef', '999 01']) {
      assertBody(await create({ pinCode }), 400, invalid('INVALID_PINCODE'));
    }
    assert.equal((await create({ pinCode: ' 999001 ' })).status, 200);
  });

  test('text fields have maximum lengths', async () => {
    assertBody(await create({ fullName: 'n'.repeat(101) }), 400, invalid('INVALID_NAME'));
    assertBody(await create({ city: 'c'.repeat(101) }), 400, invalid('INVALID_CITY'));
    assertBody(await create({ state: 's'.repeat(101) }), 400, invalid('INVALID_STATE'));
    assertBody(await create({ addressLine1: 'a'.repeat(201) }), 400, invalid('INVALID_ADD_1'));
    assertBody(await create({ addressLine2: 'a'.repeat(201) }), 400, invalid('INVALID_ADD_2'));
    assertBody(await create({ landmark: 'l'.repeat(201) }), 400, invalid('INVALID_LANDMARK'));
    assert.equal(await Address().countDocuments(), 0);
  });

  test('stores the parsed values: trimmed fields, lower-cased email', async () => {
    assert.equal((await create({ fullName: ' Test Receiver ', email: 'Receiver@Example.com' })).status, 200);
    const stored = await Address().findOne({ userId: shopper.user._id });
    assert.deepEqual([stored.fullName, stored.email], ['Test Receiver', 'receiver@example.com']);
  });

  test('the pincode check refuses anything but six digits without calling the courier', async () => {
    for (const pincode of ['abc', '99900', '9990011']) {
      assertBody(await api.request(`/addresses/check-pincode/${pincode}`), 400, invalid('INVALID_PINCODE'));
    }
    assert.deepEqual(courierCalls, []);
  });

  test('PUT /addresses/:id is validated (was: no validator), after the session check', async () => {
    const address = await createAddress(shopper.user);
    const put = (id, body, cookie = shopper.cookie) => api.request(`/addresses/${id}`, { method: 'PUT', body, cookie });
    assert.equal((await put('not-an-id', {}, null)).status, 401);
    assertBody(await put('not-an-id', {}), 400, invalid('INVALID_ID'));
    assertBody(await put(address._id, { pinCode: '1234' }), 400, invalid('INVALID_PINCODE'));
    assertBody(await put(address._id, { contactNo: '12' }), 400, invalid('INVALID_PHONE'));
    assertBody(await put(address._id, { email: 'nope' }), 400, invalid('INVALID_EMAIL'));
    // Keys of the stored document a client may send back are ignored.
    const res = await put(address._id, { _id: String(address._id), country: 'IN', city: ' New City ' });
    assert.equal(res.status, 200);
    assert.equal((await Address().findById(address._id)).city, 'New City');
  });
});

describe('ids', () => {
  test('POST /cart/add requires the product id', async () => {
    const cookie = `${shopper.cookie}; _CID=${new mongoose.Types.ObjectId()}`;
    assertBody(await post('/cart/add', { quantity: 1 }, cookie), 400, invalid('INVALID_ID'));
  });

  // The cap (100) sits far above the per-title limit (2), so 3–100 still answer the service's QUANTITY_LIMIT.
  test('POST /cart/add caps the quantity at 100', async () => {
    const cookie = `${shopper.cookie}; _CID=${new mongoose.Types.ObjectId()}`;
    const product = String(new mongoose.Types.ObjectId());
    assertBody(await post('/cart/add', { product, quantity: 101 }, cookie), 400, invalid('REQUIRED_QUANTITY'));
    assertBody(await post('/cart/add', { product, quantity: 1e9 }, cookie), 400, invalid('REQUIRED_QUANTITY'));
  });
});

describe('shopper order requests', () => {
  test('gift details have maximum lengths', async () => {
    const giftOptions = (details) => ({ isGift: true, details });
    for (const details of [{ package: 'p'.repeat(101) }, { from: 'f'.repeat(101) }, { message: 'm'.repeat(501) }, { cost: 1001 }]) {
      const res = await post('/orders/create', { method: 'cod', giftOptions: giftOptions(details) }, shopper.cookie);
      assertBody(res, 400, invalid('INVALID_REQUEST'));
    }
  });

  test('a cancel request is validated (was: no validator)', async () => {
    const order = await createOrder(shopper.user, { orderStatus: 'paid' });
    const cancel = (uniqueId, body) => post(`/orders/cancel/${uniqueId}`, body, shopper.cookie);
    assertBody(await cancel(order.orderId, { reason: 'r'.repeat(501) }), 400, invalid('ORDER_INFO_ATTEMPT_FAILED'));
    assertBody(await cancel(order.orderId, { comments: 'c'.repeat(1001) }), 400, invalid('ORDER_INFO_ATTEMPT_FAILED'));
    assertBody(await cancel('not-an-order', {}), 400, invalid('ORDER_INFO_ATTEMPT_FAILED'));
    assertBody(await cancel(order.orderId, { status: 'x' }), 400, invalid('INVALID_REQUEST'));
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });
});

describe('admin order actions (shared admin contracts)', () => {
  test('ship needs an order id and a tracking id', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const order = await createOrder(shopper.user, { orderStatus: 'paid' });
    assertBody(await post('/orders/ship', { orderId: 'nope', shipmentTrackingId: 'T' }, admin.cookie), 400, invalid('INVALID_ID'));
    for (const body of [{}, { orderId: String(order._id) }, { orderId: String(order._id), shipmentTrackingId: ' ' }]) {
      assertBody(await post('/orders/ship', body, admin.cookie), 400, invalid('INVALID_REQUEST'));
    }
    assert.equal((await Order().findById(order._id)).orderStatus, 'paid');
  });

  test('a return shipment needs its tracking reference', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const id = new mongoose.Types.ObjectId();
    const res = await api.request(`/orders/return/${id}/shipment/${id}`, { method: 'PATCH', body: {}, cookie: admin.cookie });
    assertBody(res, 400, invalid('INVALID_REQUEST'));
  });

  test('a return shipment checks the path ids after the merge (no operator from the query or body)', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const id = new mongoose.Types.ObjectId();
    const patch = (path, body) => api.request(path, { method: 'PATCH', body, cookie: admin.cookie });
    const path = `/orders/return/${id}/shipment/${id}`;
    assertBody(await patch(`${path}?id[$ne]=x`, { shipment: 'PICKUP-1' }), 400, invalid('INVALID_REQUEST'));
    assertBody(await patch(path, { shipment: 'PICKUP-1', requestId: { $ne: 'x' } }), 400, invalid('INVALID_REQUEST'));
    assertBody(await patch(path, { shipment: 'PICKUP-1', requestId: 'nope' }), 400, invalid('INVALID_ID'));
  });

  test('the session check still comes first', async () => {
    assert.equal((await post('/orders/ship', {})).status, 401);
    assert.equal((await post('/store-credit', {})).status, 401);
  });
});
