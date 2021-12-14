const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');

const { models, enums } = require('../constants');

const Collection = mongoose.model(models.COLLECTION);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder } = req.allParams();

    const query = { isDeleted: false };
    const allowedSortingFields = ['title', 'createdAt', 'popularity', 'priority'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      sort: {
        [sortBy]: Number(sortOrder),
      },
      populate: {
        path: 'books',
        select: 'title poster',
      },
    };

    const collectionRes = await Collection.paginate(query, options);

    return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collectionRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = req.allParams();

    let collectionId = `CL-${generateRandomNumber()}`;

    const payload = {
      collectionId, title, description, tags,
      poster,
      books,
      relatedCollections, relatedCategories, featuredAuthors,
      priority, popularity,
    };

    const collection = await Collection.create(payload);

    return res.ok({ message: 'COLLECTION_CREATE_SUCCESS', data: collection });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = req.allParams();

    const collection = await Collection.findOne({ _id: id, isDeleted: false });

    if (!collection) {
      return res.error('COLLECTION_NOT_EXIST');
    }

    const payload = {
      title, description, tags,
      poster,
      books,
      relatedCollections, relatedCategories, featuredAuthors,
      priority, popularity,
    };

    const collectionRes = await Collection.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'COLLECTION_UPDATE_SUCCESS', data: collectionRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const collectionIndex = req.app.collectionIndex;


    const lunrIdArray = [];
    collectionIndex.search(`${q}*`).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray }, isDeleted: false };


    const collections = await Collection.find(query);

    return res.ok({ message: 'COLLECTION_SEARCH_SUCCESS', data: collections });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'books',
      select: 'title ISBN author inventory poster price popularity editorsPick currentDiscount bestSeller',
    }, {
      path: 'relatedCategories',
      select: `categoryId _id title numberOfBooks thumbnail`,
    }, {
      path: 'featuredAuthors',
      select: 'name avatar',
    }, {
      path: 'relatedCollections',
      select: 'title tags poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      }
    }];

    const collection = await Collection.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (collection) {
      return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collection });
    } else {
      return res.error('COLLECTION_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'books',
      select: 'title ISBN author inventory poster price popularity editorsPick currentDiscount bestSeller',
    }, {
      path: 'relatedCategories',
      select: `categoryId _id title numberOfBooks thumbnail`,
    }, {
      path: 'featuredAuthors',
      select: 'name avatar',
    }, {
      path: 'relatedCollections',
      select: 'title tags poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      }
    }];

    const collection = await Collection.findOne({ collectionId: id, isDeleted: false }).populate(populateOptions);

    if (collection) {
      return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collection });
    } else {
      return res.error('COLLECTION_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const collection = await Collection.findOne({ _id: id, isDeleted: false });

    if (collection) {
      collection.isDeleted = true;
      collection.deletedAt = new Date();
      await collection.save();
      return res.ok('COLLECTION_DELETE_SUCCESS');
    } else {
      return res.error('COLLECTION_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
