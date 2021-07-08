const mongoose = require('mongoose');

const { models, enums } = require('../constants');


const Users = mongoose.model(models.USER);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {
      role: enums.USER_ROLES.USER,
    };

    const options = {
      page,
      limit
    };

    const users = await Users.paginate(query, options);

    return res.ok({ message: 'USER_LIST_SUCCESS', data: users });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { } = req.allParams();

    const payload = {  };

    const user = await Users.findOneAndUpdate(payload);

    return res.ok({ message: 'USER_UPDATE_SUCCESS', data: user });
  } catch (e) {
    return res.internalServerError(e);
  }
};
