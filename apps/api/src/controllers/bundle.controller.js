const { handleControllerError } = require('../helpers/appError.helper');
const bundleService = require('../services/bundle.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, category } = req.allParams();
    const data = await bundleService.listBundles({ page, limit, sortBy, sortOrder, category });
    return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const params = req.allParams();
    const { title, description, tags, poster, popularity, priority, currentDiscount, bundledBooks, categories } = params;
    const { relatedBundles, relatedCollections, weight, price, membersPrice } = params;
    const data = await bundleService.createBundle({
      title,
      description,
      tags,
      poster,
      popularity,
      priority,
      currentDiscount,
      bundledBooks,
      categories,
      relatedBundles,
      relatedCollections,
      weight,
      price,
      membersPrice,
    });
    return res.ok({ message: 'BUNDLE_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.allParams();
    const { id, title, description, tags, poster, popularity, priority, relatedBundles, bundledBooks, categories } = params;
    const { relatedCollections, currentDiscount, price, membersPrice } = params;
    const data = await bundleService.updateBundle(id, {
      title,
      description,
      tags,
      poster,
      popularity,
      priority,
      relatedBundles,
      bundledBooks,
      categories,
      relatedCollections,
      currentDiscount,
      price,
      membersPrice,
    });
    return res.ok({ message: 'BUNDLE_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await bundleService.searchBundles(req.app.bundlesIndex, q);
    return res.ok({ message: 'BUNDLE_SEARCH_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await bundleService.getBundleById(id);
    return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await bundleService.getBundleByBundleId(id);
    return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await bundleService.deleteBundle(id);
    return res.ok('BUNDLE_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
