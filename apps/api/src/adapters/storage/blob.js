const { vendorError } = require('../vendor-error');

// Real storage adapter: Vercel Blob (the same store and SDK version as the seed's image upload). Loaded only when
// STORAGE_ADAPTER=blob (src/env.js then requires BLOB_READ_WRITE_TOKEN).

/** @typedef {import('./types').StorageAdapter} StorageAdapter */

// Every call is bounded so a slow vendor can't hold a request (and a serverless invocation) open.
const TIMEOUT_MS = 10_000;

// Paths are unique (callers add a random part and a timestamp), so browsers and the CDN may keep a file a year,
// as the seed's catalog images do.
const CACHE_MAX_AGE_SECONDS = 31_536_000;

/**
 * Builds the Vercel Blob adapter. The SDK is required here, not at module load, so nothing touches it unless this
 * adapter is selected. The token is passed explicitly on every call (the SDK would otherwise read the environment).
 * @param {{ token?: string }} config
 * @returns {StorageAdapter} `put` rejects with `Error('Storage upload failed')` carrying only an HTTP status or a
 *   short error code.
 * @throws {Error} naming BLOB_READ_WRITE_TOKEN when it is missing (never a value).
 */
const create = ({ token } = {}) => {
  if (!token) throw new Error('The Vercel Blob storage adapter needs BLOB_READ_WRITE_TOKEN');

  const { put } = require('@vercel/blob');

  return {
    name: 'blob',
    put: async ({ pathname, body, contentType }) => {
      try {
        const blob = await put(pathname, body, {
          access: 'public',
          token,
          contentType,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: CACHE_MAX_AGE_SECONDS,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return { url: blob.url, pathname: blob.pathname };
      } catch (error) {
        throw vendorError('Storage upload failed', error);
      }
    },
  };
};

module.exports = { CACHE_MAX_AGE_SECONDS, TIMEOUT_MS, create };
