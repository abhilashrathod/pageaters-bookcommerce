const { handleControllerError } = require('../helpers/appError.helper');
const fileService = require('../services/file.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

// Not routed (legacy placeholder).
module.exports.upload = async (req, res) => {
  try {
    return res.ok('SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.uploadBucket = async (req, res) => {
  try {
    const { fileModule, title } = req.allParams();
    // `req.file`: the single `file` field parsed by middlewares/upload.middleware.js (undefined without one).
    const fileUrl = await fileService.uploadFile({ fileModule, title, file: req.file });
    return res.ok({ message: 'FILE_UPLOADED', data: { fileUrl } });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
