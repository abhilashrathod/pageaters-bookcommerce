const { execFileSync } = require('node:child_process');

const { TEST_ENV } = require('./env');
const { blockNetwork, installVendorStubs } = require('./stubs');

// Runs once, when test/helpers/index.js is first required — so a test file must require ./helpers before anything
// in src/. src/env.js and src/appConfig.js read the environment at import, so the test database's URI has to be
// known before the database exists: a free local port is reserved here and startTestApp() starts MongoDB on it.

const findFreePort = () =>
  Number(
    execFileSync(
      process.execPath,
      ['-e', "const s = require('net').createServer().listen(0, '127.0.0.1', () => { process.stdout.write(String(s.address().port)); s.close(); });"],
      { encoding: 'utf8' },
    ),
  );

const DB_NAME = 'pageaters_test';
const DB_PORT = findFreePort();

Object.assign(process.env, TEST_ENV, { MONGODB_URI: `mongodb://127.0.0.1:${DB_PORT}/${DB_NAME}` });
installVendorStubs();
blockNetwork();

module.exports = { DB_NAME, DB_PORT };
