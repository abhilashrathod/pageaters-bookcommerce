const mongoose = require('mongoose');
const { kebabCase, sortBy } = require('lodash');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');

const { models } = require('../constants');

const StoreDeal = mongoose.model(models.STORE_DEALS);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder, offset, category } = req.allParams();

    const query = { isActive: true };
    const allowedSortingFields = ['title', 'createdAt', 'priority'];

    if (category) {
      query.categories = category;
    }

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      offset,
      sort: {
        [sortBy]: sortOrder,
      },
      select: 'ctaLink ctaText dealId poster title _id',
    };

    const dealsRes = await StoreDeal.paginate(query, options);

    return res.ok({ message: 'STORE_DEAL_LIST_SUCCESS', data: dealsRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { poster, ctaLink, ctaText, title, description, priority, categories, productSets } = req.allParams();

    let dealId = `DE-${generateRandomNumber(10)}`;
    const payload = {
      dealId,
      poster,
      ctaLink,
      ctaText,
      title,
      description,
      categories,
      priority,
      productSets,
    };

    const dealsRes = await StoreDeal.create(payload);

    return res.ok({ message: 'STORE_DEAL_CREATE_SUCCESS', data: dealsRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, poster, ctaLink, ctaText, title, description, categories, priority, productSets } = req.allParams();

    const dealRes = await StoreDeal.findOne({ _id: id, isActive: true });

    if (!dealRes) {
      return res.error('STORE_DEAL_NOT_EXIST');
    }

    const payload = {
      poster,
      ctaLink,
      ctaText,
      title,
      categories,
      description,
      priority,
      productSets,
    };

    const dealsRes = await StoreDeal.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'STORE_DEAL_UPDATE_SUCCESS', data: dealsRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'productSets.set',
      populate: {
        path: 'products.product',
        select: 'bookId title ISBN author inventory poster price popularity editorsPick currentDiscount inventory newRelease preOrder bestSeller',
        populate: {
          path: 'products.product.author',
          select: 'name'
        }
      },
    }, {
      path: 'categories',
      select: 'categoryId _id title numberOfBooks thumbnail',
    }];

    const dealRes = await StoreDeal.findOne({ _id: id, isActive: true })
      .populate(populateOptions);

    if (dealRes) {
      dealRes.productSets = sortBy(dealRes.productSets, (item) => item.priority);

      for (let productSet of dealRes.productSets) {
        productSet.set.products = sortBy(productSet.set.products, (item) => item.priority);
      }
      return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data: dealRes });
    } else {
      return res.error('AUTHOR_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'productSets.set',
      populate: {
        path: 'products.product',
        select: 'bookId title ISBN author inventory poster price popularity editorsPick currentDiscount inventory newRelease preOrder bestSeller',
      },
    }, {
      path: 'categories',
      select: 'categoryId _id title numberOfBooks thumbnail',
    }];

    let dealRes = await StoreDeal.findOne({ dealId: id, isActive: true })
      .populate(populateOptions);

    if (dealRes) {
      dealRes.productSets = sortBy(dealRes.productSets, (item) => item.priority);

      for (let productSet of dealRes.productSets) {
        productSet.set.products = sortBy(productSet.set.products, (item) => item.priority);
      }

      return res.ok({ message: 'STORE_DEAL_LIST_SUCCESS', data: dealRes });
    } else {
      return res.error('STORE_DEAL_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const dealRes = await StoreDeal.findOne({ _id: id, isActive: true });

    if (dealRes) {
      dealRes.isActive = false;
      dealRes.deactivatedAt = new Date();
      dealRes.save();
      return res.ok('STORE_DEAL_DELETE_SUCCESS');
    } else {
      return res.error('STORE_DEAL_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
