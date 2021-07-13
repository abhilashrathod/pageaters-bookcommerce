const mongoose = require('mongoose');
const colors = require('colors');
const lunr = require('lunr');

const { models, enums } = require('../constants');
const { ENVIRONMENT } = require('../appConfig');

const Books = mongoose.model(models.STORE_BOOK);
const Authors = mongoose.model(models.AUTHOR);
const Collections = mongoose.model(models.COLLECTION);
const Categories = mongoose.model(models.CATEGORY);

const indexBooks = (app) => {
  // index all books in lunr on startup
  return new Promise(async (resolve, reject) => {
    const allBooks = await Books.find({isDeleted: false});

    // setup lunr indexing
    const booksIndex = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('authorName', { boost: 9 });
      this.field('tags', { boost: 5 });
      this.field('description');

      const lunrIndex = this;

      // add to lunr index
      allBooks.forEach((product) => {
        const doc = {
          title: product.title,
          authorName: product.authorName,
          tags: product.tags.join(', '),
          description: product.description,
          id: product._id,
        };
        lunrIndex.add(doc);
      });
    });

    app.booksIndex = booksIndex;
    if (ENVIRONMENT !== 'test') {
      console.log(colors.cyan('- Books indexing complete'));
    }
  });
};

const indexAuthors = (app) => {
  // index all authors in lunr on startup
  return new Promise(async (resolve, reject) => {
    const allAuthors = await Authors.find({isDeleted: false});

    // setup lunr indexing
    const authorIndex = lunr(function() {
      this.field('name', { boost: 10 });
      this.field('intro', { boost: 5 });

      const lunrIndex = this;

      // add to lunr index
      allAuthors.forEach((author) => {
        const doc = {
          name: author.name,
          intro: author.intro,
          id: author._id,
        };
        lunrIndex.add(doc);
      });
    });

    app.authorIndex = authorIndex;
    if (ENVIRONMENT !== 'test') {
      console.log(colors.cyan('- Authors indexing complete'));
    }
  });
};

const indexCollections = (app) => {
  return new Promise(async (resolve, reject) => {
    const allCollections = await Collections.find({isDeleted: false});

    // setup lunr indexing
    const collectionIndex = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('tags', { boost: 5 });
      this.field('description');

      const lunrIndex = this;

      // add to lunr index
      allCollections.forEach((collection) => {
        const doc = {
          title: collection.title,
          description: collection.description,
          tags: collection.tags.join(', '),
          id: collection._id,
        };
        lunrIndex.add(doc);
      });
    });

    app.collectionIndex = collectionIndex;
    if (ENVIRONMENT !== 'test') {
      console.log(colors.cyan('- Collection indexing complete'));
    }
  });
};

const indexCategories = (app) => {
  return new Promise(async (resolve, reject) => {
    const allCategories = await Categories.find({isDeleted: false});

    // setup lunr indexing
    const categoryIndex = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('description');

      const lunrIndex = this;

      // add to lunr index
      allCategories.forEach((category) => {
        const doc = {
          title: category.title,
          description: category.description,
          id: category._id,
        };
        lunrIndex.add(doc);
      });
    });

    app.categoryIndex = categoryIndex;
    if (ENVIRONMENT !== 'test') {
      console.log(colors.cyan('- Category indexing complete'));
    }
  });
};

// start indexing
const runIndexing = (app) => {
  if (ENVIRONMENT !== 'test') {
    console.info(colors.yellow('Setting up indexes..'));
  }

  return Promise.all([
    indexBooks(app),
    indexAuthors(app),
    indexCollections(app),
    indexCategories(app),
  ])
    .catch((err) => {
      console.info(colors.yellow('Error setting up indexes', err));
      process.exit(2);
    });
};

module.exports = {
  runIndexing,
};
