const { handleControllerError } = require('../helpers/appError.helper');
const addOnService = require('../services/add-on.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

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
    const { name, description, poster, category, priority, price, currentDiscount, inventory, productPrefrerence, products } = req.allParams();
    const data = await addOnService.createAddOn({ name, description, poster, category, priority, price, currentDiscount, inventory, productPrefrerence, products });
    return res.ok({ message: 'ADD_ON_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// Legacy: always 500 (see addOnService.updateAddOn).
module.exports.update = async (req, res) => {
  try {
    const data = await addOnService.updateAddOn();
    return res.ok({ message: 'ADD_ON_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// Legacy: 500 for a live add-on (see addOnService.getAddOnById).
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
    const data = await addOnService.groupAddOnsByCategory();
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
