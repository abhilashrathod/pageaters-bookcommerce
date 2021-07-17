const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Bundles = mongoose.model(models.BUNDLE);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {isDeleted: false};

    const options = {
      page,
      limit
    };

    const bundle = await Bundles.paginate(query, options);

    return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data: bundle });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, tags, poster, currentDiscount, bundledBooks, price, membersPrice } = req.allParams();

    let bundleId = `BL-${generateRandomNumber()}`;

    const payload = { bundleId, title, description, tags, poster, currentDiscount, bundledBooks, price, membersPrice };

    const bundle = await Bundles.create(payload);

    return res.ok({ message: 'BUNDLE_CREATE_SUCCESS', data: bundle });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description, tags, poster, } = req.allParams();

    const bundle = await Bundles.findOne({_id: id, isDeleted: false });

    if (!bundle) {
      return res.error('BUNDLE_NOT_EXIST');
    }

    const payload = { title, description, tags, poster};

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

    const populateOptions = {
      path: 'bundledBooks',
      select: `title ISBN author poster price membersPrice`
    };

    const bundles = await Bundles.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (bundles) {
      return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data: bundles })
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

    const populateOptions = {
      path: 'bundledBooks',
      select: '_id title ISBN author poster price membersPrice'
    };

    const bundle = await Bundles.findOne({ bundleId: id, isDeleted: false });

    if (bundle) {
      return res.ok({ message: 'BUNDLE_LIST_SUCCESS', data: bundle })
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
