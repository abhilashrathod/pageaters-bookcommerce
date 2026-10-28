const mongoose = require('mongoose');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { toArray, kebabCase } = require('lodash');

const { generateRandomNumber, getId, arrayDifference } = require('../helpers/utils.helper');

const { models } = require('../constants');
const { PROJECT_ROOT } = require('../appConfig');
const enums = require('../constants/enums');

const Book = mongoose.model(models.STORE_BOOK);
const Category = mongoose.model(models.CATEGORY);
const Author = mongoose.model(models.AUTHOR);
const Bundle = mongoose.model(models.BUNDLE);
const Collection = mongoose.model(models.COLLECTION);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder, type } = req.allParams();

    const query = { isDeleted: false, type: type || enums.PRODUCT_TYPES.BOOK };
    const allowedSortingFields = ['title', 'createdAt', 'popularity', 'priority', 'currentDiscount'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      sort: {
        [sortBy]: sortOrder,
      },
      select: `title bookId ISBN author inventory poster images tags price weight popularity editorsPick newRelease preOrder currentDiscount bestSeller`,
      populate: [{
        path: 'author',
        select: 'name intro avatar',
      }, {
        path: 'categories',
        select: '_id categoryId title'
      }],
    };

    const books = await Book.paginate(query, options);

    return res.ok({ message: 'BOOK_LIST_SUCCESS', data: books });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { type, title, tagline, eyebrow, author, description, message, tags, language, popularity, pages, readingLevel, version, availability, dimensions, weight, categories, ISBN, publicationYear, publisher, editorsPick, newRelease, bestSeller, preOrder, poster, images, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, relatedBundles, relatedCollections, price, rentPrice, membersPrice, membersRentPrice } = req.allParams();

    let bookId = `BK-${generateRandomNumber(10)}`;
    const payload = {
      bookId, type,
      title, tagline, eyebrow, author, description, tags, message,
      language, pages, version, readingLevel, popularity, availability,
      dimensions, weight,
      categories, relatedCollections, relatedBooks, relatedBundles,
      ISBN, publicationYear, publisher,
      editorsPick, bestSeller, newRelease, preOrder,
      poster, images,
      wholeSalePriceHistory, inventory, currentDiscount,
      price, rentPrice, membersPrice, membersRentPrice,
    };

    const bookRes = await Book.create(payload);

    // add book into category count
    for (let category of categories) {
      const categoryRes = await Category.findOne({ _id: category, isDeleted: false });
      categoryRes.numberOfBooks = Number(categoryRes.numberOfBooks) + 1;
      await categoryRes.save();
    }

    // add book into author's book catalog
    if (author) {
      const authorRes = await Author.findOne({ _id: author, isDeleted: false });
      authorRes.books.push(bookRes._id);
      await authorRes.save();
    }

    // add related data
    for (let bookItem of relatedBooks) {
      let iBookRes = await Book.findOne({_id : bookItem}).select('title relatedBooks');

      if (iBookRes) {
        iBookRes = iBookRes.toObject();

        const isThere = iBookRes.relatedBooks.find((bookId) => bookId.toString() === bookRes._id.toString());
        if (!isThere) {
          await Book.findOneAndUpdate({ _id: bookItem }, { $addToSet: { relatedBooks: bookRes._id }});
        }
      }
    }

    return res.ok({ message: 'BOOK_CREATE_SUCCESS', data: bookRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, type, tagline, eyebrow, description, message, tags, language, pages, readingLevel, popularity, version, availability, dimensions, weight, categories, ISBN, publicationYear, publisher, editorsPick, newRelease, bestSeller, preOrder, poster, images, wholeSalePriceHistory, inventory, currentDiscount, relatedBooks, relatedCollections, relatedBundles, price, rentPrice, membersPrice, membersRentPrice } = req.allParams();

    const book = await Book.findOne({ _id: id, isDeleted: false });

    if (!book) {
      return res.error('BOOK_NOT_EXIST');
    }

    const payload = {
      title, type, tagline, eyebrow, description, tags, message,
      language, pages, version, readingLevel, popularity, availability,
      dimensions, weight,
      categories, relatedCollections, relatedBooks, relatedBundles,
      ISBN, publicationYear, publisher,
      editorsPick, bestSeller, newRelease, preOrder,
      poster, images,
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

    // add related data
    for (let bookItem of relatedBooks) {
      let iBookRes = await Book.findOne({_id : bookItem}).select('title relatedBooks');

      if (iBookRes) {
        iBookRes = iBookRes.toObject();

        const isThere = iBookRes.relatedBooks.find((bookId) => bookId.toString() === book._id.toString());
        if (!isThere) {
          await Book.findOneAndUpdate({ _id: bookItem }, { $addToSet: { relatedBooks: book._id }});
        }
      }
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

    // The index is built once the first database connection opens; until then search finds nothing.
    if (!booksIndex) {
      return res.ok({ message: 'BOOK_SEARCH_SUCCESS', data: [] });
    }

    if (!q) {
      return res.ok({ message: 'BOOK_SEARCH_SUCCESS', data: [] });
    }

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
      .select('title ISBN bookId author poster weight price popularity inventory editorsPick newRelease preOrder currentDiscount bestSeller')
      .limit(10)
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
      select: `_id title bookId ISBN author inventory poster price popularity editorsPick newRelease preOrder currentDiscount bestSeller`,
    }, {
      path: 'relatedBundles',
      select: 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice',
    }, {
      path: 'categories',
      select: '_id categoryId title',
    }, {
      path: 'relatedCollections',
      select: '_id collectionId title poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      }
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
      select: `_id title bookId ISBN author inventory poster price popularity editorsPick newRelease preOrder currentDiscount bestSeller`,
      populate: [{
        path: 'author',
        select: '_id name',
      }, {
        path: 'categories',
        select: '_id categoryId title'
      }]
    }, {
      path: 'relatedBundles',
      select: 'bundleId _id title bundledBooks poster currentDiscount priority price membersPrice',
    }, {
      path: 'categories',
      select: '_id categoryId title',
    }, {
      path: 'relatedCollections',
      select: '_id collectionId title poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      }
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

      await Book.updateMany({ relatedBooks: id }, { $pull: { relatedBooks: id }});
      await Bundle.updateMany({ bundledBooks: id }, { $pull: { bundledBooks: id }});
      await Collection.updateMany({ books: id }, { $pull: { books: id }});

      await book.save();
      return res.ok('BOOK_DELETE_SUCCESS');
    } else {
      return res.error('BOOK_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

function convertJsStringToHtml(jsonString) {
  return jsonString.replace(/\n/g, '<br>');
}

function returnDiscountedAmount(price, discount){
  return Math.floor((price - (discount * price) / 100));
};

// FOR DEV PURPOSES ONLY
module.exports.bulkExport = async (req, res) => {
  try {
    const populateOptions = [{
      path: 'author',
      select: '_id authorId name avatar',
    }, {
      path: 'categories',
      select: '_id categoryId title',
    }];
    const selectFields = `bookId ISBN title author publisher publicationYear tagline version dimensions categories weight description language pages availability poster inventory price currentDiscount`;
    
    let products$ = await Book.find({isDeleted: false}).select(selectFields).populate(populateOptions);

    products$ = products$.map((item) => {
      return {
        slug: kebabCase(item.title+'-'+item.tagline),
        title: `${item.title} ${item.tagline ? '('+item.tagline+')' : ''}`,
        brand: item.publisher,
        description: convertJsStringToHtml(item.description),
        releaseYear: item.publicationYear,
        categories: item.categories.map(x => x.title).join('|'),
        tags: item.author ? item.author.name : '',
        inventory: item.inventory,
        price: returnDiscountedAmount(item.price, item.currentDiscount),
        discount: item.currentDiscount,
        SKU: item.bookId,
        MRP: item.price,
        
        language: item.language,
        ISBN: item.ISBN,
        version: item.version,
        pages: item.pages,
        dimensions: item.dimensions,
        weight: item.weight,
        availability: item.availability,
        productImage: `https://storebooks.s3.ap-south-1.amazonaws.com/${item.poster}`,
      }
    });

    const filePath =  path.join(PROJECT_ROOT, 'public', `product_template.csv`);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
          {id: 'slug', title: 'Slug'},
          {id: 'title', title: 'Title'},
          {id: 'description', title: 'Body (HTML)'},
          {id: 'brand', title: 'Brand'},
          {id: 'releaseYear', title: 'Release Year'},
          {id: 'categories', title: 'Categories'},
          {id: 'tags', title: 'Tags'},
          {id: 'inventory', title: 'Inventory'},
          {id: 'price', title: 'Sell Price'},
          {id: 'discount', title: 'Discount'},
          {id: 'weight', title: 'Weight'},
          {id: 'dimensions', title: 'dimensions'},
          {id: 'SKU', title: 'SKU'},
          {id: 'MRP', title: 'MRP'},
          {id: 'language', title: 'Language'},
          {id: 'ISBN', title: 'ISBN'},
          {id: 'version', title: 'Version'},
          {id: 'pages', title: 'Pages'},
          {id: 'availability', title: 'Availability'},
          {id: 'productImage', title: 'Poster'},
      ]
    });

    await csvWriter.writeRecords(products$);

    res.download(filePath, 'product_template.csv', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      }
      // Delete the temporary file after sending
      fs.unlinkSync(filePath);
    });

  } catch (e) {
    return res.internalServerError(e);
  }
};
