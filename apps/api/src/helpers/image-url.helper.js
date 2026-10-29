const bufferModule = require('buffer');
const { AWS } = require('../appConfig');

const { enums } = require('../constants');

// Image-resizer URLs on the CDN: a base64 JSON request (bucket, key, resize) appended to the CloudFront access
// point. Pure functions shared by services and by libs/ (sitemap, Google Merchant feed), which must not import
// services.

// Legacy, kept: the fallback calls `.from` on the `buffer` module (not its `Buffer` class), so a key that btoa
// rejects (characters above U+00FF) throws a TypeError instead of being encoded.
function universalBtoa(str) {
  try {
    return btoa(str);
  } catch {
    return bufferModule.from(str).toString('base64');
  }
}

const imageUrl = (bucket, name, height, width) => {
  const imageRequest = JSON.stringify({
    bucket,
    key: name,
    edits: {
      resize: {
        height,
        width,
        fit: 'cover',
      },
    },
  });

  return `${AWS.CLOUDFRONT_ACCESS_POINT}/${universalBtoa(imageRequest)}`;
};

/**
 * CDN URL of a book image (book bucket), 110×75 by default.
 * @param {string} name Object key (the book's `poster`).
 * @param {number} [height=110]
 * @param {number} [width=75]
 * @returns {string}
 */
const returnProductImage = (name, height = 110, width = 75) => imageUrl(enums.BUCKETS.BOOK, name, height, width);

/**
 * CDN URL of a bundle image, 75×75.
 * @param {string} name Object key (the bundle's `poster`).
 * @returns {string}
 */
const returnBundleImage = (name) => imageUrl(enums.BUCKETS.BUNDLES, name, 75, 75);

/**
 * CDN URL of a collection image, 75×75.
 * @param {string} name Object key (the collection's `poster`).
 * @returns {string}
 */
const returnCollectionImage = (name) => imageUrl(enums.BUCKETS.COLLECTIONS, name, 75, 75);

/**
 * CDN URL of a category image, 75×75.
 * @param {string} name Object key (the category's `thumbnail`).
 * @returns {string}
 */
const returnCategoryImage = (name) => imageUrl(enums.BUCKETS.CATEGORIES, name, 75, 75);

/**
 * CDN URL of an asset image (assets bucket, e.g. mystery box images), 75×75.
 * @param {string} name Object key.
 * @returns {string}
 */
const returnAssetImage = (name) => imageUrl(enums.BUCKETS.ASSETS, name, 75, 75);

module.exports = { returnAssetImage, returnBundleImage, returnCategoryImage, returnCollectionImage, returnProductImage };
