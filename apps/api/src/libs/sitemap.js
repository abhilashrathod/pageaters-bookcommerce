const express = require('express');
const mongoose = require('mongoose');
const js2xmlparser = require('js2xmlparser');
const moment = require('moment');
const { HOST } = require('../appConfig');
const { models } = require('../constants');

const router = express.Router();

const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const Collection = mongoose.model(models.COLLECTION);
const Category = mongoose.model(models.CATEGORY);

const { imageUrl } = require('../helpers/image-url.helper');

const URLS = {
  COLLECTION: `${HOST}/collections`,
  BOOK: `${HOST}/books`,
  BUNDLE: `${HOST}/bundles`,
  CATEGORY: `${HOST}/categories`,
};

const CONSTANT_PAGES = [
  {
    pageTitle: 'Bundles',
    url: `${HOST}/bundles`,
    description: '',
  }, {
    pageTitle: 'Collections',
    url: `${HOST}/collections`,
    description: '',
  }, {
    pageTitle: 'Categories',
    url: `${HOST}/categories`,
    description: '',
  }, {
    pageTitle: 'Login',
    url: `${HOST}/auth/login`,
    description: '',
  }, {
    pageTitle: 'Sign up',
    url: `${HOST}/auth/register`,
    description: '',
  }, {
    pageTitle: 'Mystery boxes',
    url: `${HOST}/mystery-boxes`,
    description: 'buy Mystery box of Pageaters',
  }, {
    pageTitle: 'About',
    url: `${HOST}/about`,
    description: 'Pageaters about',
  }, {
    pageTitle: 'Cancellation',
    url: `${HOST}/cancellation`,
    description: 'Cancellation & return policy of Pageaters',
  }, {
    pageTitle: 'Contact',
    url: `${HOST}/contact`,
    description: 'Contact Pageaters, customer support & query resolution about Pageaters',
  }, {
    pageTitle: 'Privacy Policy',
    url: `${HOST}/privacy-policy`,
    description: 'Pageaters Privacy Policy',
  }, {
    pageTitle: 'Terms and conditions',
    url: `${HOST}/terms-and-conditions`,
    description: 'Pageaters Terms of use',
  }, {
    pageTitle: 'Shipping policy',
    url: `${HOST}/shipping`,
    description: 'Pageaters shipping policy',
  },

];

/**
 * It generates a standard sitemal.xml for SEO purposes
 */
router.get('/', async function(req, res, next) {
  try {
    //our records to index
    const records = await getRecordsFromDataSource();

    const collection = [];
    let today = moment();
    today = today.format('YYYY-MM-DD');
    //add site root url
    const rootUrl = {};
    rootUrl.loc = `${HOST}/`;
    rootUrl.lastmod = today;
    rootUrl.changefreq = 'daily';
    rootUrl.priority = '1.0';
    collection.push(rootUrl);

    //add recipes urls
    for (let i = 0; i < records.length; i++) {
      const url = {};
      url.loc = records[i].url;
      url.lastmod = records[i].updated_at;
      // No image entry without a public image URL ('' from imageUrl): an empty image:loc is invalid.
      if (records[i].featured_image_url) {
        url['image:image'] = {
          'image:loc': records[i].featured_image_url,
          'image:caption': records[i].title,
        };
      }

      collection.push(url);
    }

    for (let record of CONSTANT_PAGES) {
      const url = {};
      url.loc = record.url;
      url.lastmod = moment().format('YYYY-MM-DD');
      collection.push(url);
    }

    const col = {
      '@': {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        'xmlns:image': 'http://www.google.com/schemas/sitemap-image/1.1',
      },
      url: collection,
    };
    const xml = js2xmlparser.parse('urlset', col);
    res.set('Content-Type', 'text/xml');
    res.status(200);
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

/**
 * @return a collection to index (typically we'll get these records from our database)
 */
async function getRecordsFromDataSource() {
  const records = [];

  const books$ = await Book.find({ isDeleted: false }).select('bookId title tagline poster');
  for (let book of books$) {
    records.push({
      url: `${URLS.BOOK}/${book.bookId}`,
      title: `${book.title} ${book.tagline}`,
      featured_image_url: imageUrl(book.poster),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  const bundles$ = await Bundle.find({ isDeleted: false }).select('bundleId title poster');
  for (let bundle of bundles$) {
    records.push({
      url: `${URLS.BUNDLE}/${bundle.bundleId}`,
      title: bundle.title,
      featured_image_url: imageUrl(bundle.poster),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  const collections$ = await Collection.find({ isDeleted: false }).select('collectionId title poster');
  for (let collection of collections$) {
    records.push({
      url: `${URLS.COLLECTION}/${collection.collectionId}`,
      title: collection.title,
      featured_image_url: imageUrl(collection.poster),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  const categories$ = await Category.find({ isDeleted: false }).select('categoryId title thumbnail');
  for (let category of categories$) {
    records.push({
      url: `${URLS.CATEGORY}/${category.categoryId}`,
      title: category.title,
      featured_image_url: imageUrl(category.thumbnail),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  return records;
}

module.exports = router;
