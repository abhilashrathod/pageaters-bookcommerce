const { handleControllerError } = require('../helpers/appError.helper');
const publicService = require('../services/public.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.contactUs = async (req, res) => {
  try {
    publicService.sendContactMail(req.allParams());
    return res.ok('MAIL_SENT');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
