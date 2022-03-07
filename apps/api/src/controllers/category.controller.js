const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Category = mongoose.model(models.CATEGORY);
const Book = mongoose.model(models.STORE_BOOK);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder } = req.allParams();

    const query = { isDeleted: false };
    const allowedSortingFields = ['title', 'createdAt', 'popularity', 'currentDiscount', 'price'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      select: `categoryId _id title numberOfBooks thumbnail`,
      sort: {
        [sortBy]: Number(sortOrder),
      },
    };

    const categoryRes = await Category.paginate(query, options);

    return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data: categoryRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, thumbnail, meta } = req.allParams();

    let categoryId = `CA-${generateRandomNumber(10)}`;

    const payload = { categoryId, title, description, thumbnail, meta };

    const category = await Category.create(payload);

    return res.created({ message: 'CATEGORY_CREATE_SUCCESS', data: category });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description, thumbnail, meta } = req.allParams();

    const category = await Category.findOne({ _id: id, isDeleted: false });

    if (!category) {
      return res.error('CATEGORY_NOT_EXIST');
    }

    const payload = { title, description, thumbnail, meta };

    const categoryRes = await Category.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'CATEGORY_UPDATE_SUCCESS', data: categoryRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const categoryIndex = req.app.categoryIndex;


    const lunrIdArray = [];
    categoryIndex.search(`${q}*`).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray }, isDeleted: false };

    const categories = await Category.find(query)
      .select('categoryId title numberOfBooks _id')
      .limit(10);

    return res.ok({ message: 'CATEGORY_SEARCH_SUCCESS', data: categories });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const category = await Category.findOne({ _id: id, isDeleted: false });

    if (category) {
      return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data: category });
    } else {
      return res.error('CATEGORY_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    const category = await Category.findOne({ categoryId: id, isDeleted: false });

    if (category) {
      return res.ok({ message: 'CATEGORY_LIST_SUCCESS', data: category });
    } else {
      return res.error('CATEGORY_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getAllProducts = async (req, res) => {
  try {
    let { id, page, limit, sortBy, sortOrder } = req.allParams();

    const query = { isDeleted: false, categories: id };
    const allowedSortingFields = ['title', 'createdAt', 'popularity', 'currentDiscount', 'price'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      select: `title bookId ISBN author poster price popularity editorsPick currentDiscount bestSeller`,
      populate: {
        path: 'author',
        select: 'name intro avatar',
      },
    };

    if (sortBy && sortOrder) {
      options.sort = {
        [sortBy]: [sortOrder],
      };
    }

    const booksRes = await Book.paginate(query, options);

    return res.ok({ message: 'BOOK_LIST_SUCCESS', data: booksRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const category = await Category.findOne({ _id: id, isDeleted: false });

    if (category) {
      category.isDeleted = true;
      category.deletedAt = new Date();
      await category.save();
      return res.ok('CATEGORY_DELETE_SUCCESS');
    } else {
      return res.error('CATEGORY_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
