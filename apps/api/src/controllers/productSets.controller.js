const { handleControllerError } = require('../helpers/appError.helper');
const productSetService = require('../services/product-set.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, categories } = req.allParams();
    const data = await productSetService.listProductSets({ page, limit, categories });
    return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const { products, title, description, categories } = req.allParams();
    const data = await productSetService.createProductSet({ products, title, description, categories });
    return res.ok({ message: 'PRODUCT_SET_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const { id, products, title, description, categories } = req.allParams();
    const data = await productSetService.updateProductSet(id, { products, title, description, categories });
    return res.ok({ message: 'PRODUCT_SET_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    if (!id) return res.ok();
    const data = await productSetService.getProductSetById(id);
    return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    if (!id) return res.ok();
    const data = await productSetService.getProductSetBySetId(id);
    return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.allParams();
    if (!slug) return res.ok();
    const data = await productSetService.getProductSetBySlug(slug);
    return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await productSetService.deactivateProductSet(id);
    return res.ok('PRODUCT_SET_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
