const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const net = require('node:net');

const { VendorCallError, clearVendorMocks, mockVendorCall } = require('./helpers');

// The integration harness must make vendor calls impossible unless a test mocks that exact call: unmocked SDK calls
// and connections to other hosts fail. Requiring ./helpers is enough; no app or database is started here.

const isVendorCall = (call) => (error) => error instanceof VendorCallError && error.call === call;

// Clients are created the way the controllers create them at import, before any mock exists.
const twilio = require('twilio')(`AC${'0'.repeat(32)}`, 'test');
const Razorpay = require('razorpay');
const razorpay = new Razorpay({ key_id: 'rzp_test_placeholder', key_secret: 'test' });
const sgMail = require('@sendgrid/mail');
const blob = require('@vercel/blob');

test('the test env is applied when ./helpers is required', () => {
  assert.equal(process.env.APP_ENV, 'test');
  assert.match(process.env.MONGODB_URI, /^mongodb:\/\/127\.0\.0\.1:\d+\/pageaters_test$/);
  assert.equal(process.env.RAZORPAY_KEY_ID, 'rzp_test_placeholder');
  for (const name of ['EMAIL_ADAPTER', 'SMS_ADAPTER', 'PAYMENTS_ADAPTER', 'SHIPPING_ADAPTER', 'STORAGE_ADAPTER']) {
    assert.equal(process.env[name], 'mock', name);
  }
});

test('unmocked SDK calls reject', async () => {
  sgMail.setApiKey('SG.test');
  await assert.rejects(twilio.messages.create({ to: '+919000000000' }), isVendorCall('twilio.messages.create'));
  await assert.rejects(razorpay.orders.create({ amount: 100 }), isVendorCall('razorpay.orders.create'));
  await assert.rejects(sgMail.send({ to: 'shopper@example.com' }), isVendorCall('sendgrid.send'));
  await assert.rejects(blob.put('uploads/test.png', 'x', { access: 'public' }), isVendorCall('blob.put'));
});

test('mockVendorCall answers one call on clients created before it, until cleared', async () => {
  const calls = [];
  mockVendorCall('razorpay.orders.create', async (payload) => {
    calls.push(payload);
    return { id: 'order_test_1' };
  });
  mockVendorCall('blob.put', (pathname) => ({ url: `https://files.example.com/${pathname}` }));

  assert.deepEqual(await razorpay.orders.create({ amount: 100 }), { id: 'order_test_1' });
  assert.deepEqual(calls, [{ amount: 100 }]);
  assert.deepEqual(await blob.put('uploads/key.png', 'x'), { url: 'https://files.example.com/uploads/key.png' });
  // Other calls on the same client stay blocked.
  await assert.rejects(razorpay.payments.fetch('pay_test'), isVendorCall('razorpay.payments.fetch'));

  clearVendorMocks();
  await assert.rejects(razorpay.orders.create({ amount: 100 }), isVendorCall('razorpay.orders.create'));
});

test('mockVendorCall refuses a call outside the stubbed vendors', () => {
  assert.throws(() => mockVendorCall('stripe.charges.create', () => {}), TypeError);
  assert.throws(() => mockVendorCall('twilio.messages.create'), TypeError);
});

test("Razorpay's webhook signature check stays real (a local HMAC, no network)", () => {
  const body = '{"event":"payment.captured"}';
  const signature = crypto.createHmac('sha256', 'test').update(body).digest('hex');
  assert.equal(Razorpay.validateWebhookSignature(body, signature, 'test'), true);
  assert.equal(Razorpay.validateWebhookSignature(body, 'bad', 'test'), false);
});

test('connections to other hosts throw; local ones are allowed', async () => {
  assert.throws(() => net.connect(443, 'api.example.com'), isVendorCall('network connection to api.example.com'));
  await assert.rejects(fetch('https://api.example.com/'), (error) => error.cause instanceof VendorCallError);

  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const socket = net.connect(server.address().port, '127.0.0.1');
  await new Promise((resolve, reject) => socket.on('connect', resolve).on('error', reject));
  socket.destroy();
  await new Promise((resolve) => server.close(resolve));
});
