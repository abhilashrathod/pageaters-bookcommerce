const path = require('node:path');

const API_ROOT = path.join(__dirname, '..', '..');

/**
 * Puts `exports` in the require cache in place of a vendor module, for adapters created after this call (each real
 * adapter requires its SDK inside `create()`). Used by the real-adapter unit tests.
 * @param {string} request Module name as the adapter requires it, e.g. 'razorpay'.
 * @param {unknown} exports
 */
const fakeModule = (request, exports) => {
  const filename = require.resolve(request, { paths: [API_ROOT] });
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

// A vendor error that quotes personal data (a recipient, an address, a token), as vendor errors do; adapters must
// not pass its message or the error itself on.
const leakyError = (fields) =>
  Object.assign(new Error("The 'To' number +919000000042 / reader@example.com / Token fake-delhivery-token is not valid"), fields);

module.exports = { API_ROOT, fakeModule, leakyError };
