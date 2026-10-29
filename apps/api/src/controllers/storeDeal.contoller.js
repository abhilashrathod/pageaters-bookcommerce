const { handleControllerError } = require('../helpers/appError.helper');
const storeDealService = require('../services/store-deal.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const dealFields = (params) => {
  const { poster, ctaLink, ctaText, title, description, priority, categories, productSets } = params;
  return { poster, ctaLink, ctaText, title, description, priority, categories, productSets };
};

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, offset, category } = req.allParams();
    const data = await storeDealService.listDeals({ page, limit, sortBy, sortOrder, offset, category });
    return res.ok({ message: 'STORE_DEAL_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = await storeDealService.createDeal(dealFields(req.allParams()));
    return res.ok({ message: 'STORE_DEAL_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.allParams();
    const data = await storeDealService.updateDeal(params.id, dealFields(params));
    return res.ok({ message: 'STORE_DEAL_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await storeDealService.getDealById(id);
    return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await storeDealService.getDealByDealId(id);
    return res.ok({ message: 'STORE_DEAL_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await storeDealService.deactivateDeal(id);
    return res.ok('STORE_DEAL_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
