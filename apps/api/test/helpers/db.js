const { MongoMemoryServer } = require('mongodb-memory-server-core');

const { allowHosts } = require('./stubs');

// A throwaway MongoDB per test file (node --test runs each file in its own process). Never Atlas, never the
// owner's .env. The first run on a machine downloads the pinned MongoDB binary (~80 MB, about 15 s) into
// ~/.cache/mongodb-binaries over verified TLS; later runs start a server in about a second.

const MONGODB_VERSION = '8.2.6';
// The default download mirror (MongoBinaryDownloadUrl); the network guard opens it only during create().
const DOWNLOAD_HOSTS = ['fastdl.mongodb.org'];

let server;

/**
 * Starts the in-memory server on the given local port.
 * @param {{ port: number, dbName: string }} options
 */
const startMemoryDb = async ({ port, dbName }) => {
  // mongodb-memory-server verifies the download's TLS certificate only when npm sets this; pnpm doesn't.
  process.env.npm_config_strict_ssl ??= 'true';
  server = await allowHosts(DOWNLOAD_HOSTS, () =>
    MongoMemoryServer.create({ instance: { ip: '127.0.0.1', port, dbName }, binary: { version: MONGODB_VERSION } }),
  );
};

/** Stops the in-memory server and deletes its data directory. */
const stopMemoryDb = async () => {
  await server?.stop({ doCleanup: true, force: true });
  server = undefined;
};

/** Empties every collection (keeps indexes), so one test's writes don't leak into the next. */
const clearDb = async (connection) => {
  const collections = await connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

module.exports = { clearDb, startMemoryDb, stopMemoryDb };
