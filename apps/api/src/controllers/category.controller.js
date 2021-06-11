const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');

const { HOST, PROJECT_ROOT } = require('./../appConfig');
const { models } = require('../constants');

const { encrypt, decrypt } = require('../helpers/encryption.helper');
const { writeFile } = require('./../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const Category = mongoose.model(models.CATEGORY);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {};

    const options = {
      page,
      limit
    };

    const author = await Category.paginate(query, options);

    return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data: author });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { authorId, intro, title, description, avatar, books } = req.allParams();

    const payload = { authorId, intro, title, description, avatar, books };

    const categoryList = await Category.create(payload);

    return res.ok({ message: 'CATEGORY_CREATE_SUCCESS', data: categoryList });
  } catch (e) {
    return res.internalServerError(e);
  }
};
