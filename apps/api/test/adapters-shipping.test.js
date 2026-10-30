const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

require('./helpers');
const { leakyError } = require('./helpers/fake-module');

// The shipping adapter (src/adapters/shipping): the Delhivery adapter against a fake fetch (exact requests — the
// token only in the Authorization header, the encoded pincode, the form body the legacy code sent —, timeout, clean
// errors, missing keys) and the mock (the documented serviceability rule, fake waybills, bounded recording).
// Serviceability and shipments over HTTP on the mock are in address.test.js and order-lifecycle.test.js.

const delhivery = require('../src/adapters/shipping/delhivery');
const mock = require('../src/adapters/shipping/mock');

const BASE_URL = 'https://staging-express.delhivery.com';
const TOKEN = 'fake-delhivery-token';

const RECORD = { postal_code: { pin: 110001, cod: 'Y', pre_paid: 'Y', district: 'Test District', state_code: 'TS' } };

// A fetch that records each call and answers `respond(url, init)` (a { status, body } or a thrown error).
const fakeFetch = (respond) => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, ...init });
    const { status = 200, body } = await respond(url, init);
    return { ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'string' ? JSON.parse(body) : body) };
  };
  return { calls, fetch };
};

const SHIPMENT = {
  shipments: [
    {
      name: 'Test Receiver',
      add: 'Line 1 Line 2 Near Test Park',
      pin: '110001',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      phone: '9000000099',
      order: 'OD-TEST-1',
      payment_mode: 'Prepaid',
      products_desc: 'Test Book One x 2,',
      cod_amount: '',
      total_amount: 499,
      shipment_width: 20,
      shipment_height: 5,
      weight: 800,
      shipping_mode: 'Surface',
      address_type: 'home',
    },
  ],
  pickup_location: { name: 'PAGEATERS DEMO WAREHOUSE', add: 'Unit 1', city: 'Gandhinagar', pin_code: '382016', country: 'India', phone: '9000000000' },
};

const isCleanShippingError = (fields) => (error) => {
  assert.equal(error.message, 'Shipping request failed');
  assert.deepEqual({ ...error }, fields);
  assert.equal(error.cause, undefined);
  assert.doesNotMatch(String(error.stack), /fake-delhivery-token|reader@example\.com|\+91|9000000099/);
  return true;
};

describe('Delhivery shipping adapter', () => {
  test('checks a pincode with the token in the Authorization header only, the pincode encoded, bounded', async () => {
    const { calls, fetch } = fakeFetch(() => ({ body: { delivery_codes: [RECORD] } }));
    const adapter = delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch });
    assert.equal(adapter.name, 'delhivery');

    assert.deepEqual(await adapter.checkPincode('110001'), RECORD);
    await adapter.checkPincode('11 0&token=x');
    const [call, encoded] = calls;
    assert.equal(call.url, 'https://staging-express.delhivery.com/c/api/pin-codes/json?filter_codes=110001');
    assert.equal(call.method, 'GET');
    assert.deepEqual(call.headers, { Authorization: 'Token fake-delhivery-token', Accept: 'application/json' });
    assert.equal(call.body, undefined);
    assert.ok(call.signal instanceof AbortSignal, 'every call is bounded');
    assert.equal(delhivery.TIMEOUT_MS, 10_000);
    assert.equal(encoded.url, 'https://staging-express.delhivery.com/c/api/pin-codes/json?filter_codes=11%200%26token%3Dx');
    assert.ok(calls.every(({ url }) => !url.includes(TOKEN)), 'the token never travels in a URL');
  });

  test('an empty delivery_codes answer means not serviceable', async () => {
    const { fetch } = fakeFetch(() => ({ body: { delivery_codes: [] } }));
    assert.equal(await delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch }).checkPincode('999000'), undefined);
  });

  test('books a shipment with the encoded form body and the legacy headers, and answers the courier body', async () => {
    const answer = { success: true, packages: [{ waybill: 'WB-TEST-1' }] };
    const { calls, fetch } = fakeFetch(() => ({ body: answer }));
    const adapter = delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch });

    assert.deepEqual(await adapter.createShipment({ ...SHIPMENT, extra: 'ignored' }), answer);
    const [call] = calls;
    assert.equal(call.url, 'https://staging-express.delhivery.com/api/cmu/create.json');
    assert.equal(call.method, 'POST');
    assert.equal(
      JSON.stringify(call.headers),
      JSON.stringify({ Authorization: 'Token fake-delhivery-token', 'Content-Type': 'application/x-www-form-urlencoded' }),
    );
    assert.equal(call.body, new URLSearchParams({ format: 'json', data: JSON.stringify(SHIPMENT) }).toString());
    assert.ok(call.signal instanceof AbortSignal);
  });

  // Was: the JSON went into the form raw, so `&`, `+` or `%` broke it or added fields.
  test('encodes the form so &, +, % and injected fields survive as data', async () => {
    const { calls, fetch } = fakeFetch(() => ({ body: { success: true, packages: [{ waybill: 'WB-TEST-2' }] } }));
    const [shipment] = SHIPMENT.shipments;
    const tricky = {
      ...SHIPMENT,
      shipments: [
        {
          ...shipment,
          add: 'Flat 5 & 6, A+B Towers, 100% Road &format=xml&x=',
          products_desc: 'Pride & Prejudice x 2, C++ Primer, 50% Off & More,',
        },
      ],
    };
    await delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch }).createShipment(tricky);
    const form = new URLSearchParams(calls[0].body);
    assert.deepEqual([...form.keys()], ['format', 'data']);
    assert.equal(form.get('format'), 'json');
    assert.deepEqual(JSON.parse(form.get('data')), tricky);
    assert.doesNotMatch(calls[0].body, /[&+%]format=xml/);
  });

  test('a refusal is an answer, not an error', async () => {
    const { fetch } = fakeFetch(() => ({ body: { success: false, rmk: 'Test refusal' } }));
    assert.deepEqual(await delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch }).createShipment(SHIPMENT), {
      success: false,
      rmk: 'Test refusal',
    });
  });

  test('builds the public tracking URL of a waybill', () => {
    const { fetch } = fakeFetch(() => ({}));
    assert.equal(delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch }).trackingUrl('WB-1'), 'https://www.delhivery.com/track/package/WB-1');
  });

  test('an HTTP error rejects with only its status', async () => {
    const { fetch } = fakeFetch(() => ({ status: 401, body: { error: 'Token fake-delhivery-token is invalid for reader@example.com' } }));
    const adapter = delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch });
    await assert.rejects(adapter.checkPincode('110001'), isCleanShippingError({ status: 401 }));
    await assert.rejects(adapter.createShipment(SHIPMENT), isCleanShippingError({ status: 401 }));
  });

  test('a network error or timeout rejects with only a short code', async () => {
    const network = fakeFetch(() => {
      throw Object.assign(new TypeError('fetch failed'), { cause: leakyError({ code: 'ECONNRESET' }) });
    });
    await assert.rejects(
      delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch: network.fetch }).createShipment(SHIPMENT),
      isCleanShippingError({ code: 'ECONNRESET' }),
    );
    const timeout = fakeFetch(() => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    await assert.rejects(
      delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch: timeout.fetch }).checkPincode('110001'),
      isCleanShippingError({ code: 'ETIMEDOUT' }),
    );
  });

  test('an unexpected answer rejects with no detail', async () => {
    for (const body of [{ error: 'x' }, 'not json']) {
      const { fetch } = fakeFetch(() => ({ body: body === 'not json' ? '{' : body }));
      await assert.rejects(delhivery.create({ baseUrl: BASE_URL, token: TOKEN, fetch }).checkPincode('110001'), isCleanShippingError({}));
    }
  });

  test('refuses to start without its keys, naming each missing one and no value', () => {
    const { calls, fetch } = fakeFetch(() => ({}));
    assert.throws(() => delhivery.create(), { message: 'The Delhivery shipping adapter needs DELHIVERY_BASE_URL, DELHIVERY_API_TOKEN' });
    assert.throws(
      () => delhivery.create({ baseUrl: BASE_URL, token: '', fetch }),
      (error) => {
        assert.equal(error.message, 'The Delhivery shipping adapter needs DELHIVERY_API_TOKEN');
        assert.equal(error.message.includes(BASE_URL), false);
        return true;
      },
    );
    assert.deepEqual(calls, []);
  });
});

describe('mock shipping adapter', () => {
  test('every well-formed pincode is serviceable except the documented ones', async () => {
    mock.clear();
    assert.deepEqual(await mock.checkPincode('110001'), {
      postal_code: { pin: 110001, cod: 'Y', pre_paid: 'Y', district: 'Mock District', state_code: 'MK' },
    });
    assert.deepEqual(mock.UNSERVICEABLE_PINCODES, ['999000', '999999']);
    for (const pincode of [...mock.UNSERVICEABLE_PINCODES, '012345', '12345', '1234567', 'abcdef']) {
      assert.equal(await mock.checkPincode(pincode), undefined, pincode);
    }
    assert.deepEqual(mock.list()[0], { type: 'pincode', pincode: '110001' });
    mock.clear();
  });

  test('accepts every shipment with a fake waybill, records it, and tracks on a reserved host', async () => {
    mock.clear();
    const first = await mock.createShipment(SHIPMENT);
    const second = await mock.createShipment(SHIPMENT);
    const [waybill] = first.packages.map((pkg) => pkg.waybill);
    assert.equal(first.success, true);
    assert.match(waybill, /^MOCK\d{10}$/);
    assert.notEqual(second.packages[0].waybill, waybill, 'shipping again gives a new waybill');
    const [entry] = mock.list();
    assert.deepEqual(entry, { type: 'shipment', shipment: SHIPMENT, waybill });
    assert.ok(Object.isFrozen(entry));
    assert.equal(mock.trackingUrl(waybill), `https://tracking.shipping.mock.invalid/package/${waybill}`);
    mock.clear();
    assert.deepEqual(mock.list(), []);
  });

  test('keeps only the newest 50 requests and never writes to the console', async (t) => {
    const writes = ['log', 'info', 'warn', 'error', 'debug'].map((method) => t.mock.method(console, method, () => {}));
    mock.clear();
    for (let i = 1; i <= 55; i += 1) await mock.checkPincode(String(100000 + i));
    await mock.createShipment(SHIPMENT);
    const entries = mock.list();
    assert.equal(entries.length, 50);
    assert.deepEqual([entries[0].pincode, entries.at(-1).type], ['100007', 'shipment']);
    assert.equal(
      writes.reduce((count, spy) => count + spy.mock.callCount(), 0),
      0,
    );
    mock.clear();
  });
});
