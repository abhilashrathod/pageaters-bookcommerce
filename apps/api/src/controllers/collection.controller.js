const { handleControllerError } = require('../helpers/appError.helper');
const collectionService = require('../services/collection.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const collectionFields = (params) => {
  const { title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = params;
  return { title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity };
};

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, category } = req.allParams();
    const data = await collectionService.listCollections({ page, limit, sortBy, sortOrder, category });
    return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = await collectionService.createCollection(collectionFields(req.allParams()));
    return res.ok({ message: 'COLLECTION_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.allParams();
    const data = await collectionService.updateCollection(params.id, collectionFields(params));
    return res.ok({ message: 'COLLECTION_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await collectionService.searchCollections(req.app.collectionIndex, q);
    return res.ok({ message: 'COLLECTION_SEARCH_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await collectionService.getCollectionById(id);
    return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await collectionService.getCollectionByCollectionId(id);
    return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await collectionService.deleteCollection(id);
    return res.ok('COLLECTION_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
