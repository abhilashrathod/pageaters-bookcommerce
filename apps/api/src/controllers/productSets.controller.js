const mongoose = require('mongoose');
const { kebabCase, sortBy, isArray, map } = require('lodash');
const { generateRandomString, generateRandomNumber, getId } = require('../helpers/utils.helper');

const { models } = require('../constants');

const ProductSets = mongoose.model(models.PRODUCT_SETS);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, categories } = req.allParams();

    const query = { isActive: true };

    if (categories) {
      if (!isArray(categories)) {
        categories = categories.split(',');
      }

      query.categories = { $in: categories };
    }

    const options = {
      page,
      limit,
    };

    const productSetRes = await ProductSets.paginate(query, options);

    return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data: productSetRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { products, title, description, categories } = req.allParams();

    let setId = `SET-${generateRandomNumber(10)}`;
    const payload = {
      setId,
      title,
      description,
      products,
      categories,
      slug: `${kebabCase(title)}-${generateRandomString(6)}`,
    };

    const productSetRes = await ProductSets.create(payload);

    return res.ok({ message: 'PRODUCT_SET_CREATE_SUCCESS', data: productSetRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, products, title, description, categories } = req.allParams();

    let productSetRes = await ProductSets.findOne({ _id: id, isActive: true });

    if (!productSetRes) {
      return res.error('PRODUCT_SET_NOT_EXIST');
    }

    let slug = title !== productSetRes.title ? `${kebabCase(title)}-${generateRandomString(6)}` : productSetRes.slug;

    const payload = {
      title,
      description,
      products,
      categories,
      slug,
    };

    productSetRes = await ProductSets.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'PRODUCT_SET_UPDATE_SUCCESS', data: productSetRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    if (!id) return res.ok();

    const populateOptions = [{
      path: 'products.product',
      select: 'bookId title ISBN author inventory poster price popularity editorsPick currentDiscount inventory newRelease preOrder bestSeller',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    }, {
      path: 'categories',
      select: 'categoryId _id title numberOfBooks thumbnail',
    }];

    let productSetRes = await ProductSets.findOne({ _id: id, isActive: true }).populate(populateOptions);

    if (productSetRes) {
      productSetRes = productSetRes.toObject();
      productSetRes.products = sortBy(productSetRes.products, (item) => item.priority);
      return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data: productSetRes });
    } else {
      return res.error('PRODUCT_SET_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    if (!id) return res.ok();

    const populateOptions = [{
      path: 'products.product',
      select: 'bookId title ISBN author inventory poster price popularity editorsPick inventory currentDiscount newRelease preOrder bestSeller',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    }, {
      path: 'categories',
      select: 'categoryId _id title numberOfBooks thumbnail',
    }];

    let productSetRes = await ProductSets.findOne({ setId: id, isActive: true })
      .populate(populateOptions);

    if (productSetRes) {
      productSetRes = productSetRes.toObject();
      productSetRes.products = sortBy(productSetRes.products, (item) => item.priority);
      return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data: productSetRes });
    } else {
      return res.error('PRODUCT_SET_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getBySlug = async (req, res) => {
  try {
    let { slug } = req.allParams();

    if (!slug) return res.ok();

    const populateOptions = [{
      path: 'products.product',
      select: 'bookId title ISBN author inventory poster price popularity editorsPick inventory currentDiscount newRelease preOrder bestSeller',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    }, {
      path: 'categories',
      select: 'categoryId _id title numberOfBooks thumbnail',
    }];

    let productSetRes = await ProductSets.findOne({ slug, isActive: true }).populate(populateOptions);

    const sortFun = (item) => item.priority;
    const mapFun = (item) => item.product;


    if (productSetRes) {
      productSetRes = productSetRes.toObject();
      productSetRes.products = map(sortBy(productSetRes.products, sortFun), mapFun);
      return res.ok({ message: 'PRODUCT_SET_LIST_SUCCESS', data: productSetRes });
    } else {
      return res.error('PRODUCT_SET_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const productSetRes = await ProductSets.findOne({ _id: id, isActive: true });

    if (productSetRes) {
      productSetRes.isActive = false;
      productSetRes.deactivatedAt = new Date();
      await productSetRes.save();
      return res.ok('PRODUCT_SET_DELETE_SUCCESS');
    } else {
      return res.error('PRODUCT_SET_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
