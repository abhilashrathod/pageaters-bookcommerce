const { handleControllerError } = require('../helpers/appError.helper');
const userService = require('../services/user.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit } = req.allParams();
    const data = await userService.listUsers({ page, limit });
    return res.ok({ message: 'USER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// The id comes from the path only, so a body or query `id` can't redirect the update to another account.
module.exports.update = async (req, res) => {
  try {
    const data = await userService.updateUser(req.params.id, req.body ?? {});
    return res.ok({ message: 'USER_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getAllDetails = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await userService.getUserDetails(id);
    return res.ok({ message: 'USER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await userService.searchUsers(q);
    return res.ok({ message: 'USER_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
