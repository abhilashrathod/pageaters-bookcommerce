const mongoose = require('mongoose');
const express = require('express');
const convert = require('xml-js');
const { models } = require('../constants');

const router = express.Router();

const { imageUrl } = require('../helpers/image-url.helper');

const Book = mongoose.model(models.STORE_BOOK);

function returnDiscountedAmount(price, discount) {
  return Math.floor((price - (discount * price) / 100));
}

async function writeGoogleData (req, res, next) {
  // Get products
  const selectFields = `bookId ISBN title description poster inventory tagline price currentDiscount`;
  const products$ = await Book.find({ isDeleted: false }).select(selectFields);

  // Setup the XML
  const xmlOpt = { compact: true, ignoreComment: true, spaces: 4 };
  const jsonObj = {
    _declaration: { _attributes: { version: '1.0', encoding: 'utf-8' } },
    rss: {
      _attributes: {
        'xmlns:g': 'http://base.google.com/ns/1.0',
        version: '2.0',
      },
      channel: {
        title: 'Pageaters',
        description: 'Our original book collection contains only the highest quality books, allowing you to have an exceptional reading experience.',
        link: 'https://pageaters.com',
        item: [],
      },
    },
  };

  // Add products
  for (let product of products$) {
    const item = {
      'g:id': product.bookId,
      'g:title': `${product.title.trim()} ${product.tagline.trim()}`,
      'g:description': product.description,
      'g:link': `https://pageaters.com/books/${product.bookId}`,
      'g:price': `${returnDiscountedAmount(product.price, product.currentDiscount)} INR`,
      'g:image_link': imageUrl(product.poster),
      'g:availability': `${product.inventory > 0 ? 'in_stock' : 'out_of_stock'}`,
      'g:gtin': `${product.ISBN}`,
    };

    jsonObj.rss.channel.item.push(item);
  }

  // Generate XML
  const xml = convert.js2xml(jsonObj, xmlOpt);

  res.set('Content-Type', 'text/xml');
  res.status(200);
  res.send(xml);
}

router.get('/', writeGoogleData);

module.exports = router;
