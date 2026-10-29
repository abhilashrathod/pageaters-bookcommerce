const { handleControllerError } = require('../helpers/appError.helper');
const categoryService = require('../services/category.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.allParams();
    const data = await categoryService.listCategories({ page, limit, sortBy, sortOrder });
    return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const { title, description, thumbnail, meta } = req.allParams();
    const data = await categoryService.createCategory({ title, description, thumbnail, meta });
    return res.created({ message: 'CATEGORY_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const { id, title, description, thumbnail, meta, popularity, priority } = req.allParams();
    const data = await categoryService.updateCategory(id, { title, description, thumbnail, meta, popularity, priority });
    return res.ok({ message: 'CATEGORY_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await categoryService.searchCategories(req.app.categoryIndex, q);
    return res.ok({ message: 'CATEGORY_SEARCH_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await categoryService.getCategoryById(id);
    return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await categoryService.getCategoryByCategoryId(id);
    return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getOverviewProducts = async (req, res) => {
  try {
    const { id, page, limit, sortOrder } = req.allParams();
    const data = await categoryService.getOverview(id, { page, limit, sortOrder });
    return res.ok({ message: 'BOOK_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getAllProducts = async (req, res) => {
  try {
    const { id, page, limit, sortBy, sortOrder } = req.allParams();
    const data = await categoryService.listProducts(id, { page, limit, sortBy, sortOrder });
    return res.ok({ message: 'BOOK_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await categoryService.deleteCategory(id);
    return res.ok('CATEGORY_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
