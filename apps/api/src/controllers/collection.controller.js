const mongoose = require('mongoose');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');

const { models } = require('../constants');

const Collection = mongoose.model(models.COLLECTION);
const Book = mongoose.model(models.STORE_BOOK);

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit, sortBy, sortOrder, category } = req.allParams();

    const query = { isDeleted: false };

    if (category) {
      query.relatedCategories = category;
    }

    const allowedSortingFields = ['title', 'createdAt', 'popularity', 'priority'];

    if (sortBy && !allowedSortingFields.includes(sortBy)) {
      return res.error('SORTING_NOT_ALLOWED');
    }

    const options = {
      page,
      limit,
      sort: {
        [sortBy]: sortOrder,
      },
      select: `title collectionId tags poster priority popularity books`,
      populate: {
        path: 'books',
        select: 'title bookId ISBN author inventory poster price weight popularity availability newRelease preOrder editorsPick currentDiscount bestSeller',
        populate: [{
          path: 'author',
          select: 'name intro avatar',
        }, {
          path: 'categories',
          select: '_id categoryId title'
        }],
      },
    };

    const collectionRes = await Collection.paginate(query, options);

    return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collectionRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    let { title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = req.allParams();

    let collectionId = `CL-${generateRandomNumber(10)}`;

    const payload = {
      collectionId, title, description, tags,
      poster,
      books,
      relatedCollections, relatedCategories, featuredAuthors,
      priority, popularity,
    };

    const collectionRes = await Collection.create(payload);

    // add this collection in related collection of the selected books
    for (let bookItem of books) {
      let iBookRes = await Book.findOne({_id : bookItem}).select('title relatedCollections');

      if (iBookRes) {
        iBookRes = iBookRes.toObject();

        const isThere = iBookRes.relatedCollections.find((collectionId) => collectionId.toString() === collectionRes._id.toString());
        if (!isThere) {
          await Book.findOneAndUpdate({ _id: bookItem }, { $addToSet: { relatedCollections: collectionRes._id }});
        }
      }
    }

    // add this collection in related collection of the selected collections
    for (let collectionItem of relatedCollections) {
      let iCollectionRes = await Collection.findOne({_id : collectionItem}).select('title relatedCollections');

      if (iCollectionRes) {
        iCollectionRes = iCollectionRes.toObject();

        const isThere = iCollectionRes.relatedCollections.find((collectionId) => collectionId.toString() === collectionRes._id.toString());
        if (!isThere) {
          await Collection.findOneAndUpdate({ _id: collectionItem }, { $addToSet: { relatedCollections: collectionRes._id }});
        }
      }
    }

    return res.ok({ message: 'COLLECTION_CREATE_SUCCESS', data: collectionRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.update = async (req, res) => {
  try {
    let { id, title, description, tags, books, poster, relatedCollections, relatedCategories, featuredAuthors, priority, popularity } = req.allParams();

    const collection = await Collection.findOne({ _id: id, isDeleted: false });

    if (!collection) {
      return res.error('COLLECTION_NOT_EXIST');
    }

    const payload = {
      title, description, tags,
      poster,
      books,
      relatedCollections, relatedCategories, featuredAuthors,
      priority, popularity,
    };

    const collectionRes = await Collection.findOneAndUpdate({ _id: id }, { $set: { ...payload } }, { new: true });

    // add this collection in related collection of the selected books
    for (let bookItem of books) {
      let iBookRes = await Book.findOne({_id : bookItem}).select('title relatedCollections');

      if (iBookRes) {
        iBookRes = iBookRes.toObject();

        const isThere = iBookRes.relatedCollections.find((collectionId) => collectionId.toString() === collectionRes._id.toString());
        if (!isThere) {
          await Book.findOneAndUpdate({ _id: bookItem }, { $addToSet: { relatedCollections: collectionRes._id }});
        }
      }
    }

    // add this collection in related collection of the selected collections
    for (let collectionItem of relatedCollections) {
      let iCollectionRes = await Collection.findOne({_id : collectionItem}).select('title relatedCollections');

      if (iCollectionRes) {
        iCollectionRes = iCollectionRes.toObject();

        const isThere = iCollectionRes.relatedCollections.find((collectionId) => collectionId.toString() === collectionRes._id.toString());
        if (!isThere) {
          await Collection.findOneAndUpdate({ _id: collectionItem }, { $addToSet: { relatedCollections: collectionRes._id }});
        }
      }
    }

    return res.ok({ message: 'COLLECTION_UPDATE_SUCCESS', data: collectionRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.search = async (req, res) => {
  try {
    let { q } = req.allParams();
    const collectionIndex = req.app.collectionIndex;

    // The index is built once the first database connection opens; until then search finds nothing.
    if (!collectionIndex) {
      return res.ok({ message: 'COLLECTION_SEARCH_SUCCESS', data: [] });
    }


    const lunrIdArray = [];
    collectionIndex.search(`${q}*`).forEach((id) => {
      lunrIdArray.push(getId(id.ref));
    });

    const query = { _id: { $in: lunrIdArray }, isDeleted: false };


    const collections = await Collection.find(query);

    return res.ok({ message: 'COLLECTION_SEARCH_SUCCESS', data: collections });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'books',
      select: 'bookId title ISBN author inventory poster price popularity availability newRelease preOrder editorsPick currentDiscount bestSeller',
    }, {
      path: 'relatedCategories',
      select: 'categoryId _id title numberOfBooks thumbnail',
    }, {
      path: 'featuredAuthors',
      select: 'name avatar books authorId',
    }, {
      path: 'relatedCollections',
      select: 'collectionId title tags poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      }
    }];

    const collection = await Collection.findOne({ _id: id, isDeleted: false }).populate(populateOptions);

    if (collection) {
      return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collection });
    } else {
      return res.error('COLLECTION_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    let { id } = req.allParams();

    const populateOptions = [{
      path: 'books',
      select: 'bookId title ISBN author inventory poster price popularity availability newRelease preOrder editorsPick currentDiscount bestSeller',
    }, {
      path: 'relatedCategories',
      select: `categoryId _id title numberOfBooks thumbnail`,
    }, {
      path: 'featuredAuthors',
      select: 'name avatar books authorId',
    }, {
      path: 'relatedCollections',
      select: 'collectionId title tags poster books',
      populate: {
        path: 'books',
        select: 'title poster',
      }
    }];

    const collection = await Collection.findOne({ collectionId: id, isDeleted: false }).populate(populateOptions);

    if (collection) {
      return res.ok({ message: 'COLLECTION_LIST_SUCCESS', data: collection });
    } else {
      return res.error('COLLECTION_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.destroy = async (req, res) => {
  try {
    let { id } = req.allParams();

    const collection = await Collection.findOne({ _id: id, isDeleted: false });

    if (collection) {
      collection.isDeleted = true;
      collection.deletedAt = new Date();
      await collection.save();
      return res.ok('COLLECTION_DELETE_SUCCESS');
    } else {
      return res.error('COLLECTION_NOT_EXIST');
    }
  } catch (e) {
    return res.internalServerError(e);
  }
};
