const { handleControllerError } = require('../helpers/appError.helper');
const authorService = require('../services/author.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.allParams();
    const data = await authorService.listAuthors({ page, limit, sortBy, sortOrder });
    return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const { name, intro, avatar, books } = req.allParams();
    const data = await authorService.createAuthor({ name, intro, avatar, books });
    return res.ok({ message: 'AUTHOR_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const { id, name, intro, avatar, books } = req.allParams();
    const data = await authorService.updateAuthor(id, { name, intro, avatar, books });
    return res.ok({ message: 'AUTHOR_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await authorService.searchAuthors(q);
    return res.ok({ message: 'AUTHOR_SEARCH_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await authorService.getAuthorById(id);
    return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await authorService.getAuthorByAuthorId(id);
    return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await authorService.deleteAuthor(id);
    return res.ok('AUTHOR_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
