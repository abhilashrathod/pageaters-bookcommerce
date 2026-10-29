const { get } = require('lodash');

const { handleControllerError } = require('../helpers/appError.helper');
const storeCreditService = require('../services/store-credit.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.issueCredit = async (req, res) => {
  try {
    const { userId, credit, orderId } = req.allParams();
    await storeCreditService.issueCredit({ userId, credit, orderId });
    return res.created({ message: 'STORE_CREDIT_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getStoreCredit = async (req, res) => {
  try {
    const data = await storeCreditService.getBalance(get(req, 'user.userId', ''));
    return res.ok({ message: 'STORE_CREDIT_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getCreditHistory = async (req, res) => {
  try {
    const { page, limit } = req.allParams();
    const data = await storeCreditService.getHistory(get(req, 'user.userId', ''), { page, limit });
    return res.ok({ message: 'STORE_CREDIT_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
