const path = require('path');
const mongoose = require('mongoose');
const { kebabCase } = require('lodash');

const { adminFileModuleSchema } = require('@pageaters/shared');

const storage = require('../adapters/storage');
const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomString } = require('../helpers/utils.helper');

// Admin image uploads, through the storage adapter (Vercel Blob or its mock), under one folder per file module.

const File = mongoose.model(models.FILE);

// `uploads/<folder>/…`: the folder names follow the seed's catalog folders (seed/src/upload.ts), but uploads live
// beside `catalog/`, never in it — the seed reports every blob under `catalog/` it didn't make as unused.
const UPLOAD_PREFIX = 'uploads';
const FOLDERS = {
  [enums.FILE_MODULES.STORE_BOOK]: 'books',
  [enums.FILE_MODULES.AUTHOR]: 'authors',
  [enums.FILE_MODULES.COLLECTION]: 'collections',
  [enums.FILE_MODULES.CATEGORY]: 'categories',
  [enums.FILE_MODULES.BUNDLE]: 'bundles',
  [enums.FILE_MODULES.ASSETS]: 'assets',
};

// DEFAULT (the only known module without a folder of its own) uses the books folder, as it used the book bucket.
const folderOf = (fileModule) => (Object.hasOwn(FOLDERS, fileModule) ? FOLDERS[fileModule] : FOLDERS[enums.FILE_MODULES.STORE_BOOK]);

// The stored content type follows the checked extension, never the client's multipart header.
const CONTENT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

// The leading bytes ("magic numbers") each allowed extension's content must start with.
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURES = { jpg: JPEG, jpeg: JPEG, png: PNG };

const contentMatches = (buffer, ext) => Buffer.isBuffer(buffer) && buffer.subarray(0, SIGNATURES[ext].length).equals(SIGNATURES[ext]);

/**
 * Stores an image publicly as `uploads/<module folder>/<kebab title>-<random>-<timestamp>.<ext>` (DEFAULT uses the
 * books folder), then records it in the `file` collection. The module must be one the File model accepts
 * (`AdminFileModule` in @pageaters/shared), checked before the upload.
 * @param {{ fileModule?: string, title?: string, file?: { originalname: string, buffer: Buffer, mimetype: string } }} input
 *   `file` is the multer file.
 * @returns {Promise<string>} The file's public URL.
 * The stored content type and the record's `mimeType` follow the checked extension, never the client's header.
 * @throws {AppError} NO_FILE_PRESENT (400); UNSUPPORTED_FILE_TYPE (400) unless the extension (any case) is jpg, jpeg or png
 *   and the content starts with that format's signature bytes;
 *   INVALID_FILE (400) for a missing or unknown `fileModule` (an array from a repeated field too). A storage failure
 *   rejects with the adapter's clean error (→ 500) and records nothing; a failed record write rejects (→ 500) after
 *   the file was stored.
 */
const uploadFile = async ({ fileModule, title, file }) => {
  if (!file) throw new AppError('NO_FILE_PRESENT');

  // The real extension, lower-cased: a bare name such as `png` has none and is refused.
  const ext = path.extname(String(file.originalname)).slice(1).toLowerCase();
  if (!Object.values(enums.VALID_FILE_TYPES).includes(ext)) throw new AppError('UNSUPPORTED_FILE_TYPE');
  if (!contentMatches(file.buffer, ext)) throw new AppError('UNSUPPORTED_FILE_TYPE');

  // Before the upload: the File model accepts only these modules, so an unknown one would leave an orphaned file.
  if (!adminFileModuleSchema.safeParse(fileModule).success) throw new AppError('INVALID_FILE');

  const fileName = `${kebabCase(title)}-${generateRandomString(10)}-${Date.now()}.${ext}`;
  const { url } = await storage.put({
    pathname: `${UPLOAD_PREFIX}/${folderOf(fileModule)}/${fileName}`,
    body: file.buffer,
    contentType: CONTENT_TYPES[ext],
  });

  await File.create({ fileName, fileModule, fileUrl: url, mimeType: CONTENT_TYPES[ext] });

  return url;
};

module.exports = { uploadFile };
