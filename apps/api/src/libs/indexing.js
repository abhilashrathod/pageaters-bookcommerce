const mongoose = require('mongoose');
const colors = require('colors');
const lunr = require('lunr');

const { models } = require('../constants');
const { ENVIRONMENT } = require('../appConfig');

const Books = mongoose.model(models.STORE_BOOK);
const Authors = mongoose.model(models.AUTHOR);
const Collections = mongoose.model(models.COLLECTION);
const Categories = mongoose.model(models.CATEGORY);
const Bundles = mongoose.model(models.BUNDLE);

const indexBooks = (app) => {
  // index all books in lunr on startup
  return new Promise(async (resolve, reject) => {
    const allBooks = await Books.find({ isDeleted: false });

    // setup lunr indexing
    const booksIndex = lunr(function() {
      this.ref('id');
      this.field('title');

      const lunrIndex = this;

      // add to lunr index
      allBooks.forEach((product) => {
        const doc = {
          title: product.title,
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
    const allAuthors = await Authors.find({ isDeleted: false });

    // setup lunr indexing
    const authorIndex = lunr(function() {
      this.field('name', { boost: 10 });
      this.field('intro', { boost: 5 });

      const lunrIndex = this;

      // add to author lunr index
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
    const allCollections = await Collections.find({ isDeleted: false });

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
          tags: collection.tags.join(', '),
          description: collection.description,
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
    const allCategories = await Categories.find({ isDeleted: false });

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

const indexBundles = (app) => {
  return new Promise(async (resolve, reject) => {
    const allBundles = await Bundles.find({ isDeleted: false });
    // setup lunr indexing
    const bundlesIndex = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('tags', { boost: 5 });

      const lunrIndex = this;

      // add to lunr index
      allBundles.forEach((bundle) => {
        const doc = {
          title: bundle.title,
          tags: bundle.tags.join(', '),
          id: bundle._id,
        };
        lunrIndex.add(doc);
      });
    });

    app.bundlesIndex = bundlesIndex;
    if (ENVIRONMENT !== 'test') {
      console.log(colors.cyan('- Bundles indexing complete'));
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
    indexBundles(app),
  ])
    .catch((err) => {
      console.info(colors.yellow('Error setting up indexes', err));
      process.exit(2);
    });
};

module.exports = {
  runIndexing,
};
