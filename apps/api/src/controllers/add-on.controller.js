const { handleControllerError } = require('../helpers/appError.helper');
const addOnService = require('../services/add-on.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

// The fields an add-on stores. The legacy admin form also sends `productPrefrerence` and `products`, which the
// model doesn't have; they are not read.
const addOnFields = (params) => {
  const { name, description, poster, category, priority, price, currentDiscount, inventory } = params;
  return { name, description, poster, category, priority, price, currentDiscount, inventory };
};

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.allParams();
    const data = await addOnService.listAddOns({ page, limit, sortBy, sortOrder });
    return res.ok({ message: 'ADD_ON_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = await addOnService.createAddOn(addOnFields(req.allParams()));
    return res.ok({ message: 'ADD_ON_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.allParams();
    const data = await addOnService.updateAddOn(params.id, addOnFields(params));
    return res.ok({ message: 'ADD_ON_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await addOnService.getAddOnById(id);
    return res.ok({ message: 'ADD_ON_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByProductId = async (req, res) => {
  try {
    const data = await addOnService.groupAddOnsByCategory(req.validated.productId);
    return res.ok({ message: 'ADD_ON_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await addOnService.deleteAddOn(id);
    return res.ok('ADD_ON_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
