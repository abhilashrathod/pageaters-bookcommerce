const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');

const { models } = require('../constants');


const Author = mongoose.model(models.AUTHOR);
const Books = mongoose.model(models.STORE_BOOK);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder } = req.allParams();

    const query = {isDeleted: false};
    const allowedSortingFields = ['name', 'createdAt', 'popularity', 'priority'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      select: `name books authorId popularity isDeleted deletedAt`,
      sort: {
        [sortBy]: sortOrder,
      },
    };

    const author = await Author.paginate(query, options);

    return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data: author });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { name, intro, avatar, books } = req.allParams();

    let authorId = `AU-${generateRandomNumber(10)}`;
    const payload = {
      authorId,
      name, intro,
      avatar,
      books,
    };

    const author = await Author.create(payload);

    if (books.length > 0) {
      await Books.updateMany({ _id: { $in: books } }, { $set: { author: author._id } }, { multi: true });
    }

    return res.ok({ message: 'AUTHOR_CREATE_SUCCESS', data: author });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, name, intro, avatar, books } = req.allParams();

    const author = await Author.findOne({ _id: id, isDeleted: false });

    if (!author) {
      return res.error('AUTHOR_NOT_EXIST');
    }

    const payload = {
      name, intro,
      avatar,
      books,
    };

    const authorRes = await Author.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    if (books.length > 0) {
      await Books.updateMany({ _id: { $in: books } }, { $set: { author: author._id } }, { multi: true });
    }

    return res.ok({ message: 'AUTHOR_UPDATE_SUCCESS', data: authorRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const authorIndex = req.app.authorIndex;


    const lunrIdArray = [];
    authorIndex.search(`${q}*`).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray }, isDeleted: false };

    const authors = await Author.find(query);

    return res.ok({ message: 'AUTHOR_SEARCH_SUCCESS', data: authors });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = {
      path: 'books',
      select: '_id title'
    };

    const author = await Author.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (author) {
      return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data: author })
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

    const populateOptions = {
      path: 'books',
      select: 'title bookId ISBN author poster price popularity availability editorsPick inventory currentDiscount inventory newRelease preOrder bestSeller'
    };

    const author = await Author.findOne({ authorId: id, isDeleted: false }).populate(populateOptions);

    if (author) {
      return res.ok({ message: 'AUTHOR_LIST_SUCCESS', data: author });
    } else {
      return res.error('AUTHOR_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const author = await Author.findOne({ _id: id, isDeleted: false });

    if (author) {
      author.isDeleted = true;
      author.deletedAt = new Date();

      if (author.books.length > 0) {
        await Books.updateMany({ _id: { $in: author.books } }, { $set: { author: null } }, { multi: true });
      }

      author.books = [];
      await author.save();
      return res.ok('AUTHOR_DELETE_SUCCESS');
    } else {
      return res.error('AUTHOR_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
