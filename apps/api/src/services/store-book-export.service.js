const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { kebabCase } = require('lodash');

const { models } = require('../constants');
const { PROJECT_ROOT } = require('../appConfig');

// The catalog CSV export (a product-import template), a development tool.
// Legacy (removed in the security step): the route is unauthenticated, and the file is written to the API's local
// `public/` folder, which a serverless deployment can't do.

const Book = mongoose.model(models.STORE_BOOK);

const EXPORT_FILE = path.join(PROJECT_ROOT, 'public', `product_template.csv`);

const COLUMNS = [
  { id: 'slug', title: 'Slug' },
  { id: 'title', title: 'Title' },
  { id: 'description', title: 'Body (HTML)' },
  { id: 'brand', title: 'Brand' },
  { id: 'releaseYear', title: 'Release Year' },
  { id: 'categories', title: 'Categories' },
  { id: 'tags', title: 'Tags' },
  { id: 'inventory', title: 'Inventory' },
  { id: 'price', title: 'Sell Price' },
  { id: 'discount', title: 'Discount' },
  { id: 'weight', title: 'Weight' },
  { id: 'dimensions', title: 'dimensions' },
  { id: 'SKU', title: 'SKU' },
  { id: 'MRP', title: 'MRP' },
  { id: 'language', title: 'Language' },
  { id: 'ISBN', title: 'ISBN' },
  { id: 'version', title: 'Version' },
  { id: 'pages', title: 'Pages' },
  { id: 'availability', title: 'Availability' },
  { id: 'productImage', title: 'Poster' },
];

const convertJsStringToHtml = (text) => text.replace(/\n/g, '<br>');
const discountedAmount = (price, discount) => Math.floor(price - (discount * price) / 100);

const toRow = (item) => ({
  slug: kebabCase(item.title + '-' + item.tagline),
  title: `${item.title} ${item.tagline ? '(' + item.tagline + ')' : ''}`,
  brand: item.publisher,
  description: convertJsStringToHtml(item.description),
  releaseYear: item.publicationYear,
  categories: item.categories.map((x) => x.title).join('|'),
  tags: item.author ? item.author.name : '',
  inventory: item.inventory,
  price: discountedAmount(item.price, item.currentDiscount),
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
});

/**
 * Writes every live store book as a CSV row (sell price = MRP less the current discount, floored) to
 * `public/product_template.csv`.
 * @returns {Promise<string>} The file's path.
 */
const writeCatalogCsv = async () => {
  const books = await Book.find({ isDeleted: false })
    .select(`bookId ISBN title author publisher publicationYear tagline version dimensions categories weight description language pages availability poster inventory price currentDiscount`)
    .populate([
      { path: 'author', select: '_id authorId name avatar' },
      { path: 'categories', select: '_id categoryId title' },
    ]);

  await createCsvWriter({ path: EXPORT_FILE, header: COLUMNS }).writeRecords(books.map(toRow));

  return EXPORT_FILE;
};

/**
 * Deletes an export file written by writeCatalogCsv (after it has been sent).
 * @param {string} filePath
 * @returns {void}
 */
const removeExportFile = (filePath) => fs.unlinkSync(filePath);

module.exports = { removeExportFile, writeCatalogCsv };
