const mongoose = require('mongoose');
const { models } = require('../constants');
const Book = mongoose.model(models.BOOK);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, q } = req.allParams();

    const query = { $text: { $search: q } };

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

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const productsIndex = req.app.productsIndex;


    const lunrIdArray = [];
    productsIndex.search(q).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray } };

    const books = await Book.find(query);

    return res.ok({ message: 'BOOK_LIST_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};

// gets the correct type of index ID
const getId = (id) => {
  if (id) {
    if (id.length !== 24) {
      return id;
    }
  }
  return mongoose.Types.ObjectId(id);
};
