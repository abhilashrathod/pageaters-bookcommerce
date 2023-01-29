const express = require('express');
const mongoose = require('mongoose');
const js2xmlparser = require('js2xmlparser');
const moment = require('moment');
const { models } = require('../constants');

const router = express.Router();

const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);
const Collection = mongoose.model(models.COLLECTION);
const Category = mongoose.model(models.CATEGORY);

const { returnProductImage, returnCollectionImage, returnCategoryImage, returnBundleImage } = require('../helpers/order.helper');

const URLS = {
  COLLECTION: 'https://pageaters.com/collections',
  BOOK: 'https://pageaters.com/books',
  BUNDLE: 'https://pageaters.com/bundles',
  CATEGORY: 'https://pageaters.com/categories',
};

const CONSTANT_PAGES = [
  {
    pageTitle: 'Bundles',
    url: 'https://pageaters.com/bundles',
    description: '',
  }, {
    pageTitle: 'Collections',
    url: 'https://pageaters.com/collections',
    description: '',
  }, {
    pageTitle: 'Categories',
    url: 'https://pageaters.com/categories',
    description: '',
  }, {
    pageTitle: 'Login',
    url: 'https://pageaters.com/auth/login',
    description: '',
  }, {
    pageTitle: 'Sign up',
    url: 'https://pageaters.com/auth/register',
    description: '',
  }, {
    pageTitle: 'Mystery boxes',
    url: 'https://pageaters.com/mystery-boxes',
    description: 'buy Mystery box of Pageaters',
  }, {
    pageTitle: 'About',
    url: 'https://pageaters.com/about',
    description: 'Pageaters about',
  }, {
    pageTitle: 'Cancellation',
    url: 'https://pageaters.com/cancellation',
    description: 'Cancellation & return policy of Pageaters',
  }, {
    pageTitle: 'Contact',
    url: 'https://pageaters.com/contact',
    description: 'Contact Pageaters, customer support & query resolution about Pageaters',
  }, {
    pageTitle: 'Privacy Policy',
    url: 'https://pageaters.com/privacy-policy',
    description: 'Pageaters Privacy Policy',
  }, {
    pageTitle: 'Terms and conditions',
    url: 'https://pageaters.com/terms-and-conditions',
    description: 'Pageaters Terms of use',
  }, {
    pageTitle: 'Shipping policy',
    url: 'https://pageaters.com/shipping',
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
    rootUrl.loc = 'https://pageaters.com/';
    rootUrl.lastmod = today;
    rootUrl.changefreq = 'daily';
    rootUrl.priority = '1.0';
    rootUrl['image:image'] = {
      'image:loc': 'https://res.cloudinary.com/pageaters/image/upload/v1673173795/web-banner_ogzs01.png',
      'image:caption': 'pageaters.com. Our original book collection contains only the highest quality books, allowing you to have an exceptional reading experience.',
    };
    collection.push(rootUrl);

    //add recipes urls
    for (let i = 0; i < records.length; i++) {
      const url = {};
      url.loc = records[i].url;
      url.lastmod = records[i].updated_at;
      url['image:image'] = {
        'image:loc': records[i].featured_image_url,
        'image:caption': records[i].title,
      };

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
      featured_image_url: returnProductImage(book.poster),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  const bundles$ = await Bundle.find({ isDeleted: false }).select('bundleId title poster');
  for (let bundle of bundles$) {
    records.push({
      url: `${URLS.BUNDLE}/${bundle.bundleId}`,
      title: bundle.title,
      featured_image_url: returnBundleImage(bundle.poster),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  const collections$ = await Collection.find({ isDeleted: false }).select('collectionId title poster');
  for (let collection of collections$) {
    records.push({
      url: `${URLS.COLLECTION}/${collection.collectionId}`,
      title: collection.title,
      featured_image_url: returnCollectionImage(collection.poster),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  const categories$ = await Category.find({ isDeleted: false }).select('categoryId title thumbnail');
  for (let category of categories$) {
    records.push({
      url: `${URLS.CATEGORY}/${category.categoryId}`,
      title: category.title,
      featured_image_url: returnCategoryImage(category.thumbnail),
      updated_at: `${moment().format('YYYY-MM-DD')}`,
    });
  }

  return records;
}

module.exports = router;
