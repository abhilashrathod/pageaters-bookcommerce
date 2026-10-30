const net = require('node:net');
const path = require('node:path');

// Vendor SDK stubs and a network guard for integration tests: no test may reach Razorpay, Twilio, SendGrid or
// Vercel Blob, or any other host (Delhivery, which the shipping adapter calls with fetch, included). The test env
// selects every mock adapter, so the SDKs are not even loaded; the stubs are a second line. An unmocked vendor call
// rejects with a VendorCallError naming the call, so a test that reaches a vendor fails loudly instead of sending a
// real payment, SMS, e-mail or file.
//
// The stubs replace the SDK modules in the require cache, so they must be installed before src/ is required
// (test/helpers/index.js does that when it is first required). Constructing a client, as the controllers do at
// import, is allowed. Tests answer a specific call with mockVendorCall(); the stubs look the mock up at call time,
// so it works on clients captured at import. api.reset() clears the mocks.

const API_ROOT = path.join(__dirname, '..', '..');

class VendorCallError extends Error {
  constructor(call) {
    super(`Test attempted a vendor call: ${call}. Vendor SDKs are stubbed in tests; use mockVendorCall().`);
    this.name = 'VendorCallError';
    this.call = call;
  }
}

const VENDORS = ['razorpay', 'twilio', 'sendgrid', 'blob'];
// Their real methods return promises.
const ASYNC_VENDORS = new Set(VENDORS);

const mocks = new Map();

/**
 * Answers one vendor call with `handler` until api.reset() / clearVendorMocks().
 * @param {string} call Dotted call path as the app makes it, e.g. 'razorpay.orders.create',
 *   'twilio.messages.create', 'sendgrid.send', 'blob.put'.
 * @param {(...args: any[]) => unknown} handler Receives the call's arguments; its return value is the result.
 */
const mockVendorCall = (call, handler) => {
  if (!VENDORS.includes(call.split('.')[0]) || typeof handler !== 'function') {
    throw new TypeError(`mockVendorCall: unknown vendor call '${call}' (starts with one of ${VENDORS.join(', ')})`);
  }
  mocks.set(call, handler);
};

const clearVendorMocks = () => mocks.clear();

// A client whose every property is another stub and whose every call goes to its mock or fails, except calls
// named in `allow` (configuration done at import time, e.g. `sgMail.setApiKey`), which do nothing.
const stubClient = (name, allow = []) =>
  new Proxy(function () {}, {
    get: (target, key) => {
      if (typeof key === 'symbol' || key === 'then') return undefined;
      if (allow.includes(key)) return () => {};
      return stubClient(`${name}.${key}`);
    },
    apply: (target, thisArg, args) => {
      const mock = mocks.get(name);
      const async = ASYNC_VENDORS.has(name.split('.')[0]);
      // Async SDKs always answer with a promise, so a sync mock or a throwing mock behaves like the real call.
      if (mock) return async ? Promise.resolve().then(() => mock(...args)) : mock(...args);
      const error = new VendorCallError(name);
      if (async) return Promise.reject(error);
      throw error;
    },
  });

// A module export that can be constructed or called once (as an SDK factory) and returns a stub client. `statics`
// keeps real static helpers that make no network call (e.g. Razorpay's webhook signature check, a local HMAC).
const stubFactory = (name, statics = {}) =>
  new Proxy(function () {}, {
    get: (target, key) => {
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return Object.hasOwn(statics, key) ? statics[key] : stubClient(`${name}.${key}`);
    },
    apply: () => stubClient(name),
    construct: () => stubClient(name),
  });

const STUBS = {
  razorpay: (real) => stubFactory('razorpay', { validateWebhookSignature: real.validateWebhookSignature }),
  twilio: () => stubFactory('twilio'),
  '@sendgrid/mail': () => stubClient('sendgrid', ['setApiKey', 'setTimeout']),
  '@vercel/blob': () => stubClient('blob'),
};

const installVendorStubs = () => {
  for (const [request, makeStub] of Object.entries(STUBS)) {
    const filename = require.resolve(request, { paths: [API_ROOT] });
    if (require.cache[filename]?.stubbed) continue;
    const real = makeStub.length > 0 ? require(filename) : undefined;
    require.cache[filename] = { id: filename, filename, loaded: true, stubbed: true, exports: makeStub(real) };
  }
};

// Network guard: sockets may only open to this machine (the in-memory MongoDB and the app under test), plus the
// hosts allowHosts() opens for the length of one call (the MongoDB binary download on a machine's first run).
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const allowed = new Set();
let guarded = false;

const blockNetwork = () => {
  if (guarded) return;
  guarded = true;
  const { connect } = net.Socket.prototype;
  net.Socket.prototype.connect = function (...args) {
    const [first] = args;
    const options = Array.isArray(first) ? first[0] : first;
    const isObject = typeof options === 'object' && options !== null;
    const host = isObject ? options.host : typeof args[1] === 'string' ? args[1] : undefined;
    const isPipe = isObject ? Boolean(options.path) : typeof first === 'string';
    const target = host ?? 'localhost';
    if (!isPipe && !LOCAL_HOSTS.has(target) && !allowed.has(target)) {
      throw new VendorCallError(`network connection to ${host}`);
    }
    return connect.apply(this, args);
  };
};

/**
 * Lets sockets open to `hosts` while `fn` runs.
 * @template T
 * @param {string[]} hosts
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
const allowHosts = async (hosts, fn) => {
  hosts.forEach((host) => allowed.add(host));
  try {
    return await fn();
  } finally {
    hosts.forEach((host) => allowed.delete(host));
  }
};

module.exports = { VendorCallError, allowHosts, blockNetwork, clearVendorMocks, installVendorStubs, mockVendorCall };
