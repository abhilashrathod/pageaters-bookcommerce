const { handleControllerError } = require('../helpers/appError.helper');
const stockAlertService = require('../services/stock-alert.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit } = req.allParams();
    const data = await stockAlertService.listProductsWithAlerts({ page, limit });
    return res.ok({ message: 'STOCK_ALERT_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getAllUsersByProduct = async (req, res) => {
  try {
    const { product } = req.allParams();
    const data = await stockAlertService.listSubscribers(product);
    return res.ok({ message: 'STOCK_ALERT_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.sendAllUsersByProduct = async (req, res) => {
  try {
    const { product } = req.allParams();
    const subscribers = await stockAlertService.sendAlerts(product);
    return res.ok({ message: 'STOCK_ALERT_LIST_SUCCESS', data: { success: true, subscribers } });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.checkSubscription = async (req, res) => {
  try {
    const { product } = req.allParams();
    if (await stockAlertService.isSubscribed(req.user.userId, product)) {
      return res.ok({ message: 'STOCK_ALERT_EXISTS', data: true });
    }
    return res.ok({ message: 'STOCK_ALERT_CHECK_NOT_EXIST', data: false });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.subscribe = async (req, res) => {
  try {
    const { product } = req.allParams();
    const data = await stockAlertService.subscribe(req.user.userId, product);
    return res.ok({ message: 'STOCK_ALERT_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.unsubscribe = async (req, res) => {
  try {
    const { product } = req.allParams();
    await stockAlertService.unsubscribe(req.user.userId, product);
    return res.ok('STOCK_ALERT_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
