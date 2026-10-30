const crypto = require('node:crypto');

const { createRecorder } = require('../recorder');

// Mock storage adapter (the default). Nothing leaves the process and nothing is written to disk: each stored file is
// recorded (before `put` resolves) as its path, content type, size and sha256 — not its bytes — in a bounded list,
// the newest 50: list() / clear(). The answer is a URL on a reserved `.invalid` host (RFC 2606), so it is
// well-formed but can never resolve; select STORAGE_ADAPTER=blob to see uploaded images.

/** @typedef {import('./types').StorageAdapter} StorageAdapter */

const BASE_URL = 'https://storage.mock.invalid/';

const recorder = createRecorder();

/** @type {StorageAdapter & { list: () => object[], clear: () => void }} */
module.exports = {
  name: 'mock',
  put: async ({ pathname, body, contentType }) => {
    const url = `${BASE_URL}${pathname}`;
    recorder.record({
      pathname,
      url,
      contentType,
      size: body.length,
      sha256: crypto.createHash('sha256').update(body).digest('hex'),
    });
    return { url, pathname };
  },
  list: recorder.list,
  clear: recorder.clear,
};
