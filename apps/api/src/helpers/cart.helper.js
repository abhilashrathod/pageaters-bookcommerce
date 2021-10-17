const mongoose = require('mongoose');

const { models } = require('../constants');
// const { } = require('./../appConfig');

const Book = mongoose.model(models.STORE_BOOK);

module.exports.calculateTotal = async function(books) {

  try {

    let total = 0;

    if (books.length === 0) {
      return total;
    }

    for (let book of books) {
      const bookRes = await Book.findOne({
        isDeleted: false,
        _id: book.product,
      }).select('currentDiscount price membersPrice');
      book.productTotal = book.quantity * (bookRes.price - ((bookRes.currentDiscount * bookRes.price) / 100));
      book.price = bookRes.price;
      total = total + Math.floor(book.productTotal);
    }

    return total;
  } catch (e) {
    return 0;
  }
};
