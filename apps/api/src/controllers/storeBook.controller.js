const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');

const { HOST, PROJECT_ROOT } = require('./../appConfig');
const { models } = require('../constants');

const { encrypt, decrypt } = require('../helpers/encryption.helper');
const { writeFile } = require('./../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const Book = mongoose.model(models.STORE_BOOK);


module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {};

    const options = {
      page,
      limit,
    };

    const books = await Book.paginate(query, options);

    return res.ok({ message: 'BOOK_LIST_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let {bookNo, title, author, description, tags, language, pages, version, dimensions, weight, category, ISBN, publicationYear, publisher, imageSmall, imageMedium, imageLarge, totalReviews, averageReviews, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, partOfBundle, price, rentPrice, membersPrice, membersRentPrice} = req.allParams();


    const payload = {bookNo, title, author, description, tags, language, pages, version, dimensions, weight, category, ISBN, publicationYear, publisher, imageSmall, imageMedium, imageLarge, totalReviews, averageReviews, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, partOfBundle, price, rentPrice, membersPrice, membersRentPrice };

    const books = await Book.create(payload);

    return res.ok({ message: 'BOOK_CREATE_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};
