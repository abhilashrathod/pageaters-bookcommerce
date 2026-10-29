const { handleControllerError } = require('../helpers/appError.helper');
const subscriberService = require('../services/subscriber.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit } = req.allParams();
    const data = await subscriberService.listSubscribers({ page, limit });
    return res.ok({ message: 'SUBSCRIBER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const { email } = req.allParams();
    const added = await subscriberService.addSubscriber(email);
    return res.ok({ message: added ? 'SUBSCRIBER_CREATE_SUCCESS' : 'SUBSCRIBER_EXIST', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
