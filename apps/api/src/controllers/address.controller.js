const mongoose = require('mongoose');
const { get } = require('lodash');
const { models } = require('../constants');
const axios = require('axios');
const colors = require('colors');
const Address = mongoose.model(models.ADDRESS);

const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { checkServiceabilityInternal } = require('../helpers/order.helper');
const { DELHIVERY } = require('../appConfig');

module.exports.getAllByUser = async (req, res) => {
  try {
    let { user } = req;

    const query = { isDeleted: false, userId: user.userId };

    const addressesRes = await Address.find(query);

    return res.ok({ message: 'ADDRESS_LIST_SUCCESS', data: addressesRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { fullName, email, contactNo, city, state, pinCode, addressLine1, addressLine2, landmark, type, isDefault } = req.allParams();
    let { user } = req;

    const isServiceable = await checkServiceabilityInternal(pinCode);

    if (isServiceable) {
      console.log(colors.green('Serviceable!'));

      if (isDefault) {
        await Address.updateMany({ isDeleted: false, userId: user.userId }, { $set: { isDefault: false } });
      }

      const payload = {
        userId: user.userId,
        fullName,
        contactNo,
        email: email ? email : user.email,
        city,
        state,
        pinCode,
        addressLine1,
        addressLine2,
        isDefault,
        landmark,
        type,
      };

      const addressRes = await Address.create(payload);

      return res.ok({ message: 'ADDRESS_CREATE_SUCCESS', data: addressRes });
    } else {
      return res.error({ message: 'PINCODE_ERROR', data: {} });
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, fullName, email, contactNo, city, state, pinCode, addressLine1, addressLine2, landmark, type, isDefault } = req.allParams();
    let { user } = req;
    const query = { _id: id, isDeleted: false, userId: user.userId };

    const addressRes = await Address.findOne();

    if (!addressRes) {
      return res.error('ADDRESS_NOT_EXIST');
    }

    if (isDefault) {
      await Address.updateMany({ isDeleted: false, userId: user.userId }, { $set: { isDefault: false } });
    }

    const payload = {
      fullName,
      contactNo,
      email: email ? email : user.email,
      city,
      state,
      pinCode,
      addressLine1,
      addressLine2,
      landmark,
      isDefault,
      type,
    };

    const updatedAddress = await Address.findOneAndUpdate(query, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'ADDRESS_UPDATE_SUCCESS', data: updatedAddress });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.makeDefault = async (req, res) => {
  try {
    let { id } = req.allParams();
    let { user } = req;
    const query = { _id: id, isDeleted: false, userId: user.userId };

    const addressRes = await Address.findOne(query);

    if (!addressRes) {
      return res.error('ADDRESS_NOT_EXIST');
    }

    await Address.updateMany({ isDeleted: false, userId: user.userId }, { $set: { isDefault: false } });

    const updatedAddress = await Address.findOneAndUpdate(query, { $set: { isDefault: true } }, { new: true });

    return res.ok({ message: 'ADDRESS_UPDATE_SUCCESS', data: updatedAddress });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();
    let { user } = req;

    const query = { _id: id, isDeleted: false, userId: user.userId };

    const addressRes = await Address.findOne(query);

    if (addressRes) {
      return res.ok({ message: 'ADDRESS_LIST_SUCCESS', data: addressRes });
    } else {
      return res.error('ADDRESS_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();
    let { user } = req;
    const query = { _id: id, isDeleted: false, userId: user.userId };

    const addressRes = await Address.findOne(query);

    if (addressRes) {
      addressRes.isDeleted = true;
      addressRes.deletedAt = new Date();
      await addressRes.save();
      return res.ok('ADDRESS_DELETE_SUCCESS');
    } else {
      return res.error('ADDRESS_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.checkServiceability = async (req, res) => {
  try {
    let { pincode } = req.allParams();

    const config = {
      method: 'get',
      url: `${DELHIVERY.BASE_URL}/c/api/pin-codes/json?filter_codes=${pincode}&token=${DELHIVERY.API_TOKEN}`,
      headers: {},
    };

    const apiRes = await axios(config);
    const pincodeRes = await apiRes.data.delivery_codes[0];

    if (pincodeRes) {
      const payload = {
        serviceable: true,
        isCod: get(pincodeRes, 'postal_code.cod', ''),
        isPrepaid: get(pincodeRes, 'postal_code.pre_paid', ''),
        district: get(pincodeRes, 'postal_code.district', ''),
        state: get(pincodeRes, 'postal_code.state_code', ''),
      };
      return res.ok({ message: 'PINCODE_SUCCESS', data: { main: payload, raw: pincodeRes } });
    } else {
      return res.error({ message: 'PINCODE_ERROR', data: {} });
    }

  } catch (e) {
    return res.internalServerError(e);
  }
};
