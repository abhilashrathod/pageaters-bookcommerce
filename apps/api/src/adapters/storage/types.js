// The storage adapter contract (AGENTS.md §4.4). `blob.js` (Vercel Blob) and `mock.js` implement it; `index.js`
// exports the one STORAGE_ADAPTER selects. Application code (services/file.service.js) depends on this, never on a
// storage SDK. Nothing is ever written to local disk.

/**
 * One file to store publicly.
 * @typedef {object} StoredFileRequest
 * @property {string} pathname Where to store it, e.g. `uploads/authors/<name>.png`. Callers make it unique; an
 *   existing path is never overwritten.
 * @property {Buffer} body
 * @property {string} contentType e.g. `image/png`.
 */

/**
 * @typedef {object} StoredFile
 * @property {string} url The public https URL.
 * @property {string} pathname
 */

/**
 * @typedef {object} StorageAdapter
 * @property {'blob' | 'mock'} name
 * @property {(file: StoredFileRequest) => Promise<StoredFile>} put Stores a file with public access and a long
 *   cache lifetime (paths are unique, so their content never changes); rejects when it was not stored.
 */

module.exports = {};
