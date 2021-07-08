const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');
const { models } = require('../constants');

const Book = mongoose.model(models.STORE_BOOK);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {};

    const options = {
      page,
      limit,
      select: `title ISBN author poster`,
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
    let { title, author, description, tags, language, pages, version, dimensions, weight, category, ISBN, publicationYear, publisher, poster, totalReviews, averageReviews, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, partOfBundle, price, rentPrice, membersPrice, membersRentPrice } = req.allParams();

    let bookNo = `BK-${generateRandomNumber()}`;
    const payload = {
      bookNo,
      title,
      author,
      description,
      tags,
      language,
      pages,
      version,
      dimensions,
      weight,
      category,
      ISBN,
      publicationYear,
      publisher,
      poster,
      totalReviews,
      averageReviews,
      wholeSalePriceHistory,
      inventory,
      currentDiscount,
      relatedBooks,
      partOfBundle,
      price,
      rentPrice,
      membersPrice,
      membersRentPrice,
    };

    const books = await Book.create(payload);

    return res.ok({ message: 'BOOK_CREATE_SUCCESS', data: books });
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
    booksIndex.search(q).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray } };

    const books = await Book.find(query)
      .select('title ISBN author poster`')
      .populate(populateOptions);

    return res.ok({ message: 'BOOK_SEARCH_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};
