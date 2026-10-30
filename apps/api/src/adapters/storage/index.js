const { env } = require('../../env');

// The storage adapter STORAGE_ADAPTER selects: `mock` (default) or `blob` (Vercel Blob). Only the selected
// implementation is loaded, so the Blob SDK is never required when the mock is in use.

/** @type {import('./types').StorageAdapter} */
module.exports = env.STORAGE_ADAPTER === 'blob' ? require('./blob').create({ token: env.BLOB_READ_WRITE_TOKEN }) : require('./mock');
