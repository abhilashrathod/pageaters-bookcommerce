const mongoose = require('mongoose');
const S3 = require('aws-sdk/clients/s3');
const { kebabCase } = require('lodash');

const { AWS } = require('../appConfig');
const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomString } = require('../helpers/utils.helper');

// Admin image uploads to S3, one bucket per file module. The adapters step moves this to Vercel Blob behind a
// storage adapter.

const File = mongoose.model(models.FILE);

const awsStoreBooksInstance = new S3({
  region: AWS.BUCKET_REGION,
  accessKeyId: AWS.BUCKET_ACCESS_KEY,
  secretAccessKey: AWS.BUCKET_SECRET_KEY,
});

const BUCKETS = {
  [enums.FILE_MODULES.STORE_BOOK]: enums.BUCKETS.BOOK,
  [enums.FILE_MODULES.AUTHOR]: enums.BUCKETS.AUTHOR,
  [enums.FILE_MODULES.COLLECTION]: enums.BUCKETS.COLLECTIONS,
  [enums.FILE_MODULES.CATEGORY]: enums.BUCKETS.CATEGORIES,
  [enums.FILE_MODULES.BUNDLE]: enums.BUCKETS.BUNDLES,
  [enums.FILE_MODULES.ASSETS]: enums.BUCKETS.ASSETS,
};

// Strict match as the legacy `switch`: only a string module picks its bucket (an array from a repeated or `[]`
// multipart field falls to the book bucket).
const getBucketName = (fileModule) =>
  typeof fileModule === 'string' && Object.hasOwn(BUCKETS, fileModule) ? BUCKETS[fileModule] : enums.BUCKETS.BOOK;

/**
 * Uploads an image to the bucket of its file module (unknown modules use the book bucket) as
 * `<kebab title>-<random>-<timestamp>.<ext>`, and records it in the `file` collection.
 * Legacy (fixed in the legacy-bugs step): the record is created without awaiting it, so a failed write (e.g. an
 * unknown `fileModule`, which the model's enum refuses) is an unhandled rejection after the response; the caller
 * gets the storage key, not a URL.
 * @param {{ fileModule?: string, title?: string, file?: { originalname: string, buffer: Buffer, mimetype: string } }} input
 *   `file` is the multer file.
 * @returns {Promise<string>} The storage key (file name).
 * @throws {AppError} NO_FILE_PRESENT (400); UNSUPPORTED_FILE_TYPE (400) unless the extension is jpg, jpeg or png.
 */
const uploadFile = async ({ fileModule = '', title, file }) => {
  const slug = kebabCase(title);
  const bucketName = getBucketName(fileModule);

  if (!file) throw new AppError('NO_FILE_PRESENT');

  const ext = file.originalname.split('.').pop();
  if (!Object.values(enums.VALID_FILE_TYPES).includes(ext)) throw new AppError('UNSUPPORTED_FILE_TYPE');

  const fileName = `${slug}-${generateRandomString(10)}-${Date.now()}.${ext}`;

  const bucketRes = await awsStoreBooksInstance.upload({ Bucket: bucketName, Body: file.buffer, Key: fileName }).promise();

  void File.create({ fileName, fileModule, fileUrl: bucketRes.Location, mimeType: file.mimetype });

  return fileName;
};

module.exports = { uploadFile };
