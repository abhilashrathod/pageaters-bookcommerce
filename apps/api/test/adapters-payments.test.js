const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

require('./helpers');
const { fakeModule, leakyError } = require('./helpers/fake-module');

// The payments adapter (src/adapters/payments): the Razorpay adapter against a fake SDK module (call shape, timeout,
// clean errors, missing keys, webhook signature) and the mock (deterministic ids, Razorpay's signature scheme,
// bounded recording). Checkout → webhook end to end on the mock is in order-checkout.test.js.

const razorpay = require('../src/adapters/payments/razorpay');
const mock = require('../src/adapters/payments/mock');

const CONFIG = { keyId: 'rzp_test_FAKEKEY123', keySecret: 'fake-key-secret', webhookSecret: 'fake-webhook-secret' };
const ORDER = { amount: 49900, currency: 'INR', receipt: 'OD-TEST-1-RCPTID' };
const sign = (body, secret) => crypto.createHmac('sha256', secret).update(body).digest('hex');

// A fake of the Razorpay SDK: a constructor whose instances expose orders.create and an axios-like api.rq. Its static
// webhook check must not be used (the adapter compares in constant time itself).
const fakeRazorpay = ({ create } = {}) => {
  const calls = { constructed: [], create: [], clients: [] };
  function Razorpay(options) {
    calls.constructed.push(options);
    this.api = { rq: { defaults: {} } };
    calls.clients.push(this);
    this.orders = {
      create:
        create ??
        (async (params) => {
          calls.create.push(params);
          return { id: 'order_FAKE123', entity: 'order', ...params, status: 'created' };
        }),
    };
  }
  Razorpay.validateWebhookSignature = () => {
    throw new Error('the adapter must not use the SDK check');
  };
  fakeModule('razorpay', Razorpay);
  return calls;
};

describe('Razorpay payments adapter', () => {
  test('builds the client with the key pair, bounds every call and creates the order as given', async () => {
    const calls = fakeRazorpay();
    const adapter = razorpay.create(CONFIG);
    assert.equal(adapter.name, 'razorpay');
    assert.deepEqual(calls.constructed, [{ key_id: CONFIG.keyId, key_secret: CONFIG.keySecret }]);
    assert.equal(calls.clients[0].api.rq.defaults.timeout, 10_000, 'every call is bounded');

    const order = await adapter.createOrder({ ...ORDER, extra: 'ignored' });
    assert.equal(JSON.stringify(calls.create), JSON.stringify([ORDER]), 'amount in paise, currency, receipt — nothing else');
    assert.equal(order.id, 'order_FAKE123');
  });

  test('rejects with a clean error carrying only the code and status when Razorpay rejects', async () => {
    fakeRazorpay({
      create: async () => {
        throw leakyError({ statusCode: 400, error: { code: 'BAD_REQUEST_ERROR', description: 'reader@example.com' } });
      },
    });
    await assert.rejects(razorpay.create(CONFIG).createOrder(ORDER), (error) => {
      assert.equal(error.message, 'Payment order failed');
      assert.deepEqual({ code: error.code, status: error.status }, { code: 'BAD_REQUEST_ERROR', status: 400 });
      assert.deepEqual(Object.keys(error).sort(), ['code', 'status']);
      assert.equal(error.cause, undefined);
      assert.doesNotMatch(String(error.stack), /reader@example\.com|\+91|Token/);
      return true;
    });
  });

  // The real SDK's normalizeError reads err.response.status, so a timeout or network error (no response) surfaces
  // as a TypeError.
  test('a timeout or network error (a TypeError from the SDK) keeps only NO_RESPONSE', async () => {
    fakeRazorpay({
      create: async () => {
        throw new TypeError("Cannot read properties of undefined (reading 'status') reader@example.com");
      },
    });
    await assert.rejects(razorpay.create(CONFIG).createOrder(ORDER), (error) => {
      assert.deepEqual([error.message, { ...error }], ['Payment order failed', { code: 'NO_RESPONSE' }]);
      assert.doesNotMatch(String(error.stack), /reader@example\.com/);
      return true;
    });
  });

  test('checks the webhook signature with the webhook secret, in constant time, without the SDK', (t) => {
    fakeRazorpay();
    const adapter = razorpay.create(CONFIG);
    const compare = t.mock.method(crypto, 'timingSafeEqual');
    const body = '{"event":"payment.captured"}';
    const valid = sign(body, CONFIG.webhookSecret);
    assert.equal(adapter.verifyWebhookSignature(body, valid), true);
    assert.equal(compare.mock.callCount(), 1, 'compared with timingSafeEqual');
    assert.equal(adapter.verifyWebhookSignature(body, sign(body, 'another-secret')), false);
    assert.equal(adapter.verifyWebhookSignature(body, sign('{}', CONFIG.webhookSecret)), false);
    for (const signature of [undefined, '', valid.slice(1), `${valid}0`, 42]) {
      assert.equal(adapter.verifyWebhookSignature(body, signature), false, String(signature));
    }
  });

  test('refuses to start without its keys, naming each missing one and no value', () => {
    const calls = fakeRazorpay();
    assert.throws(() => razorpay.create(), {
      message: 'The Razorpay payments adapter needs RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET',
    });
    assert.throws(
      () => razorpay.create({ ...CONFIG, keySecret: '' }),
      (error) => {
        assert.equal(error.message, 'The Razorpay payments adapter needs RAZORPAY_KEY_SECRET');
        assert.equal(error.message.includes(CONFIG.keyId), false);
        return true;
      },
    );
    assert.deepEqual(calls.constructed, []);
  });

  test('refuses to start when the SDK no longer exposes its HTTP client (no unbounded calls)', () => {
    function Razorpay() {
      this.orders = { create: async () => ({}) };
    }
    fakeModule('razorpay', Razorpay);
    assert.throws(() => razorpay.create(CONFIG), /set the request timeout another way/);
  });
});

describe('mock payments adapter', () => {
  test('answers a Razorpay-shaped order with a salted fake id and records it', async () => {
    const one = mock.create({ idSalt: 'test-salt' });
    const two = mock.create({ idSalt: 'test-salt' });
    const first = await one.createOrder({ ...ORDER, extra: 'ignored' });
    assert.match(first.id, /^order_mock[0-9a-f]{14}$/);
    assert.deepEqual(first, {
      id: first.id,
      entity: 'order',
      amount: 49900,
      amount_paid: 0,
      amount_due: 49900,
      currency: 'INR',
      receipt: ORDER.receipt,
      status: 'created',
      attempts: 0,
    });
    assert.equal((await two.createOrder(ORDER)).id, first.id, 'same salt and calls, same ids');
    assert.notEqual((await mock.create().createOrder(ORDER)).id, first.id, 'the default salt is random per process');
    assert.notEqual(
      (await mock.create({ idSalt: 'other-salt' }).createOrder(ORDER)).id,
      first.id,
      'an id is not derivable from the receipt alone',
    );
    const again = await one.createOrder(ORDER);
    assert.notEqual(again.id, first.id, 'the same order placed again gets a new id');
    assert.deepEqual(
      one.list().map((order) => order.id),
      [first.id, again.id],
    );
    assert.ok(Object.isFrozen(one.list()[0]));
    one.clear();
    assert.deepEqual(one.list(), []);
  });

  test("verifies Razorpay's signature scheme over the configured webhook secret", () => {
    const adapter = mock.create({ webhookSecret: 'configured-secret' });
    const body = '{"event":"payment.captured"}';
    assert.equal(adapter.verifyWebhookSignature(body, sign(body, 'configured-secret')), true);
    assert.equal(adapter.verifyWebhookSignature(body, sign(body, 'another-secret')), false);
    assert.equal(adapter.verifyWebhookSignature(body, sign(body, 'configured-secret').slice(1)), false);
    assert.equal(adapter.verifyWebhookSignature(body, undefined), false);
  });

  // Was (first 6b round): a public fallback secret, so anyone could sign a webhook and mark orders paid.
  test('without a webhook secret, nothing verifies', () => {
    const body = '{"event":"refund.processed"}';
    for (const config of [undefined, {}, { webhookSecret: '' }]) {
      const adapter = mock.create(config);
      for (const secret of ['mock-webhook-secret-test-only', 'test', '']) {
        assert.equal(adapter.verifyWebhookSignature(body, crypto.createHmac('sha256', secret).update(body).digest('hex')), false);
      }
    }
  });

  test('keeps only the newest 50 orders and never writes to the console', async (t) => {
    const writes = ['log', 'info', 'warn', 'error', 'debug'].map((method) => t.mock.method(console, method, () => {}));
    const adapter = mock.create();
    for (let i = 1; i <= 55; i += 1) await adapter.createOrder({ ...ORDER, receipt: `OD-${i}-RCPTID` });
    const orders = adapter.list();
    assert.equal(orders.length, 50);
    assert.deepEqual([orders[0].receipt, orders.at(-1).receipt], ['OD-6-RCPTID', 'OD-55-RCPTID']);
    assert.equal(
      writes.reduce((count, spy) => count + spy.mock.callCount(), 0),
      0,
    );
  });
});
