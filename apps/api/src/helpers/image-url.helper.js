// Image URLs for e-mails, the sitemap, the Google Merchant feed and the catalog export. Catalog image fields hold
// full public URLs: the seed points every one at Vercel Blob (seed/src/upload.ts, checked by its loader) and admin
// uploads answer the file's public URL (services/file.service.js). The legacy CloudFront image-resizer URLs built
// from S3 keys are gone with S3. A pure function, shared by services and libs/ (which must not import services).

/**
 * The public URL of a stored image: an absolute https URL passes through, normalised by the URL parser (`href`, so
 * it is well-formed wherever it is embedded); anything else (a legacy storage key, another scheme, empty, missing)
 * has no public URL and gives '' — an explicit "no image" rather than a broken or unsafe link.
 * @param {unknown} value An image field (`poster`, `thumbnail`, `avatar`, `images[i]`).
 * @returns {string}
 */
const imageUrl = (value) => {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

module.exports = { imageUrl };
