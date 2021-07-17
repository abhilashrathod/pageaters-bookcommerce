const mongoose = require('mongoose');
const { toArray } = require('lodash');
const colors = require('colors');
const { generateRandomNumber, getId, arrayDifference } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Book = mongoose.model(models.STORE_BOOK);
const Category = mongoose.model(models.CATEGORY);
const Author = mongoose.model(models.AUTHOR);
const Bundle = mongoose.model(models.BUNDLE);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = { isDeleted: false };

    const options = {
      page,
      limit,
      select: `title ISBN author poster price membersPrice`,
      populate: {
        path: 'author',
        select: 'name intro avatar',
      },
    };

    const books = await Book.paginate(query, options);

    return res.ok({ message: 'BOOK_LIST_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, tagline, author, description, tags, language, pages, version, dimensions, weight, categories, ISBN, publicationYear, publisher, editorsPick, bestSeller, poster, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, relatedBundles, relatedCollections, price, rentPrice, membersPrice, membersRentPrice } = req.allParams();

    let bookId = `BK-${generateRandomNumber()}`;
    const payload = {
      bookId,
      title, tagline, author, description, tags,
      language, pages, version,
      dimensions, weight,
      categories, relatedCollections, relatedBooks, relatedBundles,
      ISBN, publicationYear, publisher,
      editorsPick, bestSeller,
      poster,
      wholeSalePriceHistory, inventory, currentDiscount,
      price, rentPrice, membersPrice, membersRentPrice,
    };

    const book = await Book.create(payload);

    // add book into category count
    for (let category of categories) {
      const categoryRes = await Category.findOne({ _id: category, isDeleted: false });
      categoryRes.numberOfBooks = Number(category.numberOfBooks) + 1;
      categoryRes.save();
    }

    // add book into author's book catalog
    if (author) {
      const authorRes = await Author.findOne({ _id: author, isDeleted: false });
      authorRes.books.push(book._id);
      authorRes.save();
    }

    return res.ok({ message: 'BOOK_CREATE_SUCCESS', data: book });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, tagline, description, tags, language, pages, version, dimensions, weight, categories, ISBN, publicationYear, publisher, editorsPick, bestSeller, poster, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, relatedCollections, relatedBundles, price, rentPrice, membersPrice, membersRentPrice } = req.allParams();

    const book = await Book.findOne({ _id: id, isDeleted: false });

    if (!book) {
      return res.error('BOOK_NOT_EXIST');
    }

    const payload = {
      title, tagline, description, tags,
      language, pages, version,
      dimensions, weight,
      categories, relatedCollections, relatedBooks, relatedBundles,
      ISBN, publicationYear, publisher,
      editorsPick, bestSeller,
      poster,
      wholeSalePriceHistory, inventory, currentDiscount,
      price, rentPrice, membersPrice, membersRentPrice,
    };

    // add book into category count
    const differentCategories = arrayDifference(toArray(book.categories), categories);

    for (let category of differentCategories) {
      const categoryRes = await Category.findOne({ _id: category, isDeleted: false });
      categoryRes.numberOfBooks = Number(categoryRes.numberOfBooks) + 1;
      categoryRes.save();
    }

    const bookRes = await Book.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    return res.ok({ message: 'BOOK_UPDATE_SUCCESS', data: bookRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const booksIndex = req.app.booksIndex;

    const populateOptions = {
      path: 'author',
      select: 'name',
    };

    const lunrIdArray = [];
    booksIndex.search(`${q}*`).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray }, isDeleted: false };

    const books = await Book.find(query)
      .select('title ISBN author poster price membersPrice')
      .populate(populateOptions);

    return res.ok({ message: 'BOOK_SEARCH_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'author',
      select: '_id authorId name avatar',
    }, {
      path: 'relatedBooks',
      select: '_id bookId title',
    }, {
      path: 'partOfBundle',
      select: '_id bundleId title poster bundledBooks poster price membersPrice',
    }, {
      path: 'categories',
      select: '_id categoryId title',
    }, {
      path: 'relatedCollections',
      select: '_id collectionId title poster books',
    }];

    const book = await Book.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (book) {
      return res.ok({ message: 'BOOK_LIST_SUCCESS', data: book });
    } else {
      return res.error('BOOK_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'author',
      select: '_id authorId name avatar',
    }, {
      path: 'relatedBooks',
      select: '_id bookId title',
    }, {
      path: 'partOfBundle',
      select: '_id bundleId title poster bundledBooks poster price membersPrice',
    }, {
      path: 'categories',
      select: '_id categoryId title',
    }, {
      path: 'relatedCollections',
      select: '_id collectionId title poster books',
    }];

    const book = await Book.findOne({ bookId: id, isDeleted: false }).populate(populateOptions);
    if (book) {
      return res.ok({ message: 'BOOK_LIST_SUCCESS', data: book });
    } else {
      return res.error('BOOK_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const book = await Book.findOne({ _id: id, isDeleted: false });

    if (book) {
      book.isDeleted = true;
      book.deletedAt = new Date();

      await book.save();
      return res.ok('BOOK_DELETE_SUCCESS');
    } else {
      return res.error('BOOK_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

