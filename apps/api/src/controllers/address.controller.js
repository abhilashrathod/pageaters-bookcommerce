const { handleControllerError } = require('../helpers/appError.helper');
const addressService = require('../services/address.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const addressFields = (params) => {
  const { fullName, email, contactNo, city, state, pinCode, addressLine1, addressLine2, landmark, type, isDefault } = params;
  return { fullName, email, contactNo, city, state, pinCode, addressLine1, addressLine2, landmark, type, isDefault };
};

module.exports.getAllByUser = async (req, res) => {
  try {
    const data = await addressService.listAddresses(req.user.userId);
    return res.ok({ message: 'ADDRESS_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = await addressService.createAddress(req.user, addressFields(req.validated));
    return res.ok({ message: 'ADDRESS_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.validated;
    const data = await addressService.updateAddress(req.user, params.id, addressFields(params));
    return res.ok({ message: 'ADDRESS_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.makeDefault = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await addressService.makeDefault(req.user.userId, id);
    return res.ok({ message: 'ADDRESS_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await addressService.getAddress(req.user.userId, id);
    return res.ok({ message: 'ADDRESS_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await addressService.deleteAddress(req.user.userId, id);
    return res.ok('ADDRESS_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.checkServiceability = async (req, res) => {
  try {
    const { pincode } = req.validated;
    const data = await addressService.checkPincode(pincode);
    return res.ok({ message: 'PINCODE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
