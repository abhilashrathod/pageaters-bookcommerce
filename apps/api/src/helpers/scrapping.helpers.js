const axios = require('axios');
const cheerio = require('cheerio');
const { isNumber } = require('lodash');

const { generateRandomNumber } = require('../helpers/utils.helper');

// Async function which scrapes the data
module.exports.scrapeData = async (title, tagline, url) => {
  try {
    // Fetch HTML of the page we want to scrape
    const { data: htmlRes } = await axios.get(url);

    // Load HTML we fetched in the previous line
    const main$ = cheerio.load(htmlRes);

    const attributesHtml = main$('div#detailBullets_feature_div ul.detail-bullet-list li');
    let listPrice = main$('span#listPrice').text().slice(1);
    listPrice = listPrice ? Number(listPrice.replace(/[^0-9.-]+/g,"")) : 0;

    let attributesJson = [];
    let properties = {};

    attributesHtml.each((idx, el) => {
      const value = main$(el).children('span.a-list-item').find('span.a-text-bold').next().text();
      if (value) {
        attributesJson.push(value);
      }
    });

    for (let attr of attributesJson) {
      if (attr.includes('(') && attr.includes(')')) {
        properties.publisher = attr.trim();
      }

      if (attr.toLowerCase().includes('pages')) {
        properties.pages = attr.split(' ')[0].trim();
      }

      if (attr.toLowerCase().includes('cm')) {
        properties.dimensions = attr.split('cm')[0].trim();
      }

      if (attr.length <= 6 && (attr.toLowerCase().includes('g') || attr.toLowerCase().includes('kg'))) {
        let plop = Number(attr.split('g')[0].trim());
        if (isNumber(plop)) {
          properties.weight = plop;
        }
      }

      if (attr.toLowerCase().includes('978-')) {
        properties.ISBN = attr.split('g')[0].trim();
      }
    }

    let bookId = `BK-${generateRandomNumber(10)}`;
    const payload = {
      bookId,
      title,
      tagline,
      author: null,
      description: '',
      tags: [],
      language: 'English',
      pages: properties.pages,
      version: 'paperback',
      readingLevel: 'Beginner',
      dimensions: properties.dimensions,
      weight: properties.weight,
      categories: [],
      relatedCollections: [],
      relatedBooks: [],
      relatedBundles: [],
      ISBN: properties.ISBN,
      publicationYear: '',
      publisher: properties.publisher,
      editorsPick: false,
      bestSeller: false,
      poster: '',
      wholeSalePriceHistory: returnPercentageValue(65, listPrice),
      inventory: 2,
      currentDiscount: 25,
      price: Number(listPrice),
      rentPrice: returnPercentageValue(50, listPrice),
      membersPrice: returnPercentageValue(75, listPrice),
      membersRentPrice: 0,
    };
    console.log('book', payload);
    return payload;
  } catch (err) {
    console.error(err);
  }
};

function returnPercentageValue(percent, total) {
  return Math.floor((Number(percent) / 100) * Number(total));
}
