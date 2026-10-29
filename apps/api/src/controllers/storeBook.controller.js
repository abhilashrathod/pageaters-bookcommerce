const { handleControllerError } = require('../helpers/appError.helper');
const storeBookService = require('../services/store-book.service');
const storeBookExportService = require('../services/store-book-export.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).

const bookFields = (params) => {
  const { type, title, tagline, eyebrow, author, description, message, tags, language, popularity, pages, readingLevel } = params;
  const { version, availability, dimensions, weight, categories, ISBN, publicationYear, publisher, editorsPick } = params;
  const { newRelease, bestSeller, preOrder, poster, images, wholeSalePriceHistory, inventory, currentDiscount } = params;
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
    wholeSalePriceHistory,
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
    const { page, limit, sortBy, sortOrder, type } = req.allParams();
    const data = await storeBookService.listBooks({ page, limit, sortBy, sortOrder, type });
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
    const data = await storeBookService.searchBooks(req.app.booksIndex, q);
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

// FOR DEV PURPOSES ONLY. Legacy: unauthenticated; a failed download answers plain text (removed in the security
// step).
module.exports.bulkExport = async (req, res) => {
  try {
    const filePath = await storeBookExportService.writeCatalogCsv();

    res.download(filePath, 'product_template.csv', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      }
      // Delete the temporary file after sending
      storeBookExportService.removeExportFile(filePath);
    });
  } catch (e) {
    return handleControllerError(res, e);
  }
};
