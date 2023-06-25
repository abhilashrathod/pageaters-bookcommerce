const mongoose = require('mongoose');

const { models, enums } = require('../constants');


const Users = mongoose.model(models.USER);
const Address = mongoose.model(models.ADDRESS);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);

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

module.exports.getAllDetails = async (req, res) => {
  try {
    let { id } = req.allParams();

    const userRes = await Users.findOne({_id: id});
    const cartRes = await Cart.findOne({user: id});
    const addressRes = await Address.find({userId: id});
    const orderRes = await Order.find({userId: id});

    const details = {
      user: userRes,
      cart: cartRes,
      addresses: addressRes,
      orders: orderRes,
    };

    return res.ok({ message: 'USER_LIST_SUCCESS', data: details });
  } catch (e) {
    return res.internalServerError(e);
  }
};


module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();

    const query = { email: { $regex: q, $options: 'i' } };

    const usersRes = await Users.find(query);

    return res.ok({ message: 'USER_LIST_SUCCESS', data: usersRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};
