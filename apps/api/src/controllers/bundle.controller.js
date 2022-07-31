const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Bundles = mongoose.model(models.BUNDLE);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder, category } = req.allParams();

    const query = { isDeleted: false };

    if (category) {
      query.categories = category;
    }

    const allowedSortingFields = ['title', 'createdAt', 'popularity', 'priority', 'currentDiscount', 'price'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      select: `bundleId _id title bundledBooks poster currentDiscount priority price membersPrice`,
      sort: {
        [sortBy]: sortOrder,
      },
    };

    const bundleRes = await Bundles.paginate(query, options);

    return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data: bundleRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, tags, poster, popularity, priority, currentDiscount, bundledBooks, categories, relatedBundles, relatedCollections, weight, price, membersPrice } = req.allParams();

    let bundleId = `BL-${generateRandomNumber(10)}`;

    const payload = {
      bundleId,
      title,
      description,
      tags,
      poster,
      currentDiscount,
      bundledBooks,
      categories,
      relatedBundles,
      relatedCollections,
      price,
      weight,
      popularity,
      priority,
      membersPrice,
    };

    const bundle = await Bundles.create(payload);

    return res.ok({ message: 'BUNDLE_CREATE_SUCCESS', data: bundle });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description, tags, poster, popularity, priority, relatedBundles, bundledBooks, categories, relatedCollections, currentDiscount, price, membersPrice } = req.allParams();

    const bundle = await Bundles.findOne({ _id: id, isDeleted: false });

    if (!bundle) {
      return res.error('BUNDLE_NOT_EXIST');
    }

    const payload = {
      title,
      description,
      tags,
      poster,
      popularity,
      priority,
      categories,
      relatedBundles,
      bundledBooks,
      relatedCollections,
      currentDiscount,
      price,
      membersPrice,
    };

    const bundleRes = await Bundles.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'BUNDLE_UPDATE_SUCCESS', data: bundleRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const bundlesIndex = req.app.bundlesIndex;


    const lunrIdArray = [];
    bundlesIndex.search(`${q}*`).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray }, isDeleted: false };

    const bundles = await Bundles.find(query);

    return res.ok({ message: 'BUNDLE_SEARCH_SUCCESS', data: bundles });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'bundledBooks',
      select: `title bookId ISBN author poster price popularity editorsPick inventory newRelease currentDiscount bestSeller`,
    }, {
      path: 'relatedCollections',
      select: 'collectionId title tags poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      },
    }, {
      path: 'relatedBundles',
      select: 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice',
    }, {
      path: 'categories',
      select: 'title poster',
    }];

    const bundles = await Bundles.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (bundles) {
      return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data: bundles });
    } else {
      return res.error('BUNDLE_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'bundledBooks',
      select: `title bookId ISBN author poster price popularity editorsPick inventory newRelease currentDiscount bestSeller`,
    }, {
      path: 'relatedCollections',
      select: 'collectionId title tags poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      },
    }, {
      path: 'relatedBundles',
      select: 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice',
    }, {
      path: 'categories',
      select: 'title poster',
    }];

    let bundle = await Bundles.findOne({ bundleId: id, isDeleted: false }).populate(populateOptions);

    if (bundle) {

      bundle = bundle.toObject();
      const outOfStockBooks = bundle.bundledBooks.filter(x => x.inventory <= 0);
      bundle.inventory = outOfStockBooks.length > 0 ? 0 : 1;

      return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data: bundle });
    } else {
      return res.error('BUNDLE_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const bundle = await Bundles.findOne({ _id: id, isDeleted: false });

    if (bundle) {
      bundle.isDeleted = true;
      bundle.deletedAt = new Date();
      await bundle.save();
      return res.ok('BUNDLE_DELETE_SUCCESS');
    } else {
      return res.error('BUNDLE_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
