const { get } = require('lodash');

const { handleControllerError } = require('../helpers/appError.helper');
const favoritesService = require('../services/favorites.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const userIdOf = (req) => get(req, 'user.userId', '');

module.exports.getAll = async (req, res) => {
  try {
    const data = await favoritesService.getFavorites(userIdOf(req));
    return res.ok({ message: 'WISH_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.checkPresent = async (req, res) => {
  try {
    const { product } = req.allParams();
    const data = await favoritesService.isFavorite(userIdOf(req), product);
    return res.ok({ message: 'SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.add = async (req, res) => {
  try {
    const { product } = req.allParams();
    await favoritesService.addFavorite(userIdOf(req), product);
    return res.ok({ message: 'WISH_LIST_ADD_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.remove = async (req, res) => {
  try {
    const { product } = req.allParams();
    await favoritesService.removeFavorite(userIdOf(req), product);
    return res.ok({ message: 'WISH_LIST_DELETE_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
