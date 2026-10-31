const { handleControllerError } = require('../helpers/appError.helper');
const storeBookService = require('../services/store-book.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const bookFields = (params) => {
  const { type, title, tagline, eyebrow, author, description, message, tags, language, popularity, pages, readingLevel } = params;
  const { version, availability, dimensions, weight, categories, ISBN, publicationYear, publisher, editorsPick } = params;
  const { newRelease, bestSeller, preOrder, poster, images, inventory, currentDiscount } = params;
  const { relatedBooks, relatedBundles, relatedCollections, price, rentPrice, membersPrice, membersRentPrice } = params;
  return {
    type,
    title,
    tagline,
    eyebrow,
    author,
    description,
    message,
    tags,
    language,
    popularity,
    pages,
    readingLevel,
    version,
    availability,
    dimensions,
    weight,
    categories,
    ISBN,
    publicationYear,
    publisher,
    editorsPick,
    newRelease,
    bestSeller,
    preOrder,
    poster,
    images,
    inventory,
    currentDiscount,
    relatedBooks,
    relatedBundles,
    relatedCollections,
    price,
    rentPrice,
    membersPrice,
    membersRentPrice,
  };
};

module.exports.getAll = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, type, list } = req.allParams();
    const data = await storeBookService.listBooks({ page, limit, sortBy, sortOrder, type, list });
    return res.ok({ message: 'BOOK_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const data = await storeBookService.createBook(bookFields(req.allParams()));
    return res.ok({ message: 'BOOK_CREATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.update = async (req, res) => {
  try {
    const params = req.allParams();
    const data = await storeBookService.updateBook(params.id, bookFields(params));
    return res.ok({ message: 'BOOK_UPDATE_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.search = async (req, res) => {
  try {
    const { q } = req.allParams();
    const data = await storeBookService.searchBooks(q);
    return res.ok({ message: 'BOOK_SEARCH_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await storeBookService.getBookById(id);
    return res.ok({ message: 'BOOK_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { id } = req.allParams();
    const data = await storeBookService.getBookByBookId(id);
    return res.ok({ message: 'BOOK_LIST_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    const { id } = req.allParams();
    await storeBookService.deleteBook(id);
    return res.ok('BOOK_DELETE_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};
