// Integration test harness. Require it before anything in src/: the first require applies the test env, stubs the
// vendor SDKs and limits the network to this machine (./setup). Then: app.js (HTTP app on an in-memory MongoDB),
// fixtures/, auth.js, stubs.js (mockVendorCall), assert.js (envelopes, assertBody, eventually…) and outbox.js
// (sentEmails, sentTexts: what the mock e-mail and SMS adapters were given).
require('./setup');

module.exports = {
  ...require('./app'),
  ...require('./assert'),
  ...require('./auth'),
  ...require('./fixtures/catalog'),
  ...require('./fixtures/ids'),
  ...require('./outbox'),
  ...require('./stubs'),
};
