const { handleControllerError } = require('../helpers/appError.helper');
const analyticsService = require('../services/analytics.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const respond = (load) => async (req, res) => {
  try {
    const data = await load(req.validated);
    return res.ok({ message: 'ANALYTICS_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.summary = respond(() => analyticsService.summary());
module.exports.book = respond(({ id }) => analyticsService.book(id));
module.exports.customer = respond(({ id }) => analyticsService.customer(id));
