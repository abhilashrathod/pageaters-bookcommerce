// Integration test harness. Require it before anything in src/: the first require applies the test env, stubs the
// vendor SDKs and limits the network to this machine (./setup). Then: app.js (HTTP app on an in-memory MongoDB),
// fixtures/, auth.js and stubs.js (mockVendorCall).
require('./setup');

module.exports = {
  ...require('./app'),
  ...require('./auth'),
  ...require('./fixtures/catalog'),
  ...require('./fixtures/ids'),
  ...require('./stubs'),
};
