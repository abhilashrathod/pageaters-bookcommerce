const multer = require('multer');

// Multipart parsing for the one upload route only (POST /file/upload, after the ADMIN guard): a single file in the
// field `file`, held in memory (never written to disk), at most MAX_UPLOAD_BYTES. Every other route parses JSON
// bodies only (app.js). The file's type is checked from its bytes in services/file.service.js.

// 4 MB: Vercel Functions refuse request bodies over 4.5 MB before the API sees them, so the limit stays below that
// with room for the multipart framing and the text fields.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10, fieldSize: 10 * 1024, parts: 11 },
}).single('file');

/**
 * Parses the upload into `req.file` and the text fields into `req.body`. A file over the size limit answers 413
 * FILE_TOO_LARGE; a second file, a file under another field name, too many or too long fields, or a malformed
 * multipart body answer 400 INVALID_FILE.
 * @type {import('express').RequestHandler}
 */
const singleImageUpload = (req, res, next) =>
  parse(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.error({ statusCode: 413, message: 'FILE_TOO_LARGE' });
    return res.error('INVALID_FILE');
  });

module.exports = { singleImageUpload, MAX_UPLOAD_BYTES };
