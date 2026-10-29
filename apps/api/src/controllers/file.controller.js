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
    // Legacy: without a multipart body `req.files` is undefined and this throws (500).
    const fileUrl = await fileService.uploadFile({ fileModule, title, file: req.files[0] });
    return res.ok({ message: 'FILE_UPLOADED', data: { fileUrl } });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
