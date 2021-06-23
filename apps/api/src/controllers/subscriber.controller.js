const mongoose = require('mongoose');

const { models } = require('../constants');

const Subscriber = mongoose.model(models.SUBSCRIBER);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {};

    const options = {
      page,
      limit
    };

    const author = await Subscriber.paginate(query, options);

    return res.ok({ message: 'SUBSCRIBER_LIST_SUCCESS', data: author });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { email } = req.allParams();

    await Subscriber.create({ email });

    return res.ok({ message: 'SUBSCRIBER_CREATE_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};
