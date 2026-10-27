const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Addon = mongoose.model(models.ADD_ON);
const Book = mongoose.model(models.STORE_BOOK);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder, category } = req.allParams();

    const query = { isDeleted: false };

    const allowedSortingFields = ['name'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      sort: {
        [sortBy]: sortOrder,
      },
    };

    const addOnsRes = await Addon.paginate(query, options);

    return res.ok({ message: 'ADD_ON_LIST_SUCCESS', data: addOnsRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { name, description, poster, category, priority, price, currentDiscount, inventory, productPrefrerence, products } = req.allParams();

    let addOnId = `AO-${generateRandomNumber(10)}`;

    const payload = {
      addOnId,
      name,
      description,
      poster,
      category,
      currentDiscount,
      inventory,
      priority,
      price,
      currentDiscount,
      productPrefrerence, 
      products
    };

    const addOnRes = await Addon.create(payload);

    return res.ok({ message: 'ADD_ON_CREATE_SUCCESS', data: addOnRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { name, description, poster, category, priority, price, currentDiscount, inventory, productPrefrerence, products } = req.allParams();

    const addOn = await Addon.findOne({ _id: id, isDeleted: false });

    if (!addOn) {
      return res.error('ADD_ON_NOT_EXIST');
    }

    const payload = {
      addOnId,
      name,
      description,
      poster,
      category,
      currentDiscount,
      inventory,
      priority,
      price,
      currentDiscount,
      productPrefrerence, 
      products
    };

    const addOnRes = await Addon.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'ADD_ON_UPDATE_SUCCESS', data: addOnRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'products',
      select: `title bookId ISBN author poster price popularity editorsPick inventory newRelease currentDiscount preOrder bestSeller`,
    }];

    const addOnRes = await Addon.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (addOnRes) {
      return res.ok({ message: 'ADD_ON_LIST_SUCCESS', data: bundles });
    } else {
      return res.error('ADD_ON_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByProductId = async (req, res) => {
  try {
    let { productId } = req.allParams();

    const pipeline = [
      {
        $group: {
          _id: '$category', // Group by the 'type' field
          addOns: { $push: '$$ROOT' } // Create an array of add-ons in each group
        }
      }
    ];

    // Aggregate the data using the defined pipeline
    const groupedAddOns = await Addon.aggregate(pipeline);

    return res.ok({ message: 'ADD_ON_LIST_SUCCESS', data: groupedAddOns });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const addOnRes = await Addon.findOne({ _id: id, isDeleted: false });

    if (addOnRes) {
      addOnRes.isDeleted = true;
      addOnRes.deletedAt = new Date();
      await addOnRes.save();
      return res.ok('ADD_ON_DELETE_SUCCESS');
    } else {
      return res.error('ADD_ON_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
