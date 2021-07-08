const mongoose = require('mongoose');
const colors = require('colors');
const lunr = require('lunr');

const { models, enums } = require('../constants');
const { ENVIRONMENT } = require('../appConfig');

const Books = mongoose.model(models.STORE_BOOK);
const Authors = mongoose.model(models.AUTHOR);

const indexBooks = (app) => {
  // index all books in lunr on startup
  return new Promise(async (resolve, reject) => {
    const allBooks = await Books.find({});

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
          tags: product.tags,
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
  // index all books in lunr on startup
  return new Promise(async (resolve, reject) => {
    const allAuthors = await Authors.find({});

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


// start indexing products and orders
const runIndexing = (app) => {
  if (ENVIRONMENT !== 'test') {
    console.info(colors.yellow('Setting up indexes..'));
  }

  // indexOrders(app),
  // indexCustomers(app),
  // indexReviews(app),

  return Promise.all([
    indexBooks(app),
    indexAuthors(app),
  ])
    .catch((err) => {
      console.info(colors.yellow('Error setting up indexes', err));
      process.exit(2);
    });
};

module.exports = {
  indexBooks,
  indexAuthors,
  runIndexing,
};
