const { handleControllerError } = require('../helpers/appError.helper');
const mysteryBoxService = require('../services/mystery-box.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const boxFields = (params) => {
  const { title, description, tags, images, books, currentDiscount, weight, price } = params;
  return { title, description, tags, images, books, currentDiscount, weight, price };
};

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit } = req.allParams();
    const data = await mysteryBoxService.listBoxes({ page, limit });
    return res.ok({ message: 'MYSTERY_BOX_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = await mysteryBoxService.createBox(boxFields(req.allParams()));
    return res.ok({ message: 'MYSTERY_BOX_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.allParams();
    const data = await mysteryBoxService.updateBox(params.id, boxFields(params));
    return res.ok({ message: 'MYSTERY_BOX_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    if (!id) return res.ok();
    const data = await mysteryBoxService.getBoxById(id);
    return res.ok({ message: 'MYSTERY_BOX_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    if (!id) return res.ok();
    const data = await mysteryBoxService.getBoxByBoxId(id);
    return res.ok({ message: 'MYSTERY_BOX_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    if (!id) return res.ok();
    await mysteryBoxService.deleteBox(id);
    return res.ok('MYSTERY_BOX_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
