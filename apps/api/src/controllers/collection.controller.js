const mongoose = require('mongoose');
const { generateRandomNumber } = require('../helpers/utils.helper');

const { models, enums } = require('../constants');

const Collection = mongoose.model(models.COLLECTION);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {};

    const options = {
      page,
      limit,
    };

    const collections = await Collection.paginate(query, options);

    return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collections });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, tags, books, thumbnail, poster, relatedCollections, relatedCategories } = req.allParams();

    let collectionId = `CL-${generateRandomNumber()}`;

    const payload = {
      collectionId, title, description, tags,
      poster, thumbnail,
      books, relatedCollections, relatedCategories,
    };

    const collection = await Collection.create(payload);

    return res.ok({ message: 'COLLECTION_CREATE_SUCCESS', data: collection });
  } catch (e) {
    return res.internalServerError(e);
  }
};
