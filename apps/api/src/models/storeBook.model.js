const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { API_URL } = require('./../appConfig');

const { enums, models } = require('./../constants');

const schema = new Schema({
    bookNo: { type: String, default: '' },
    title: { type: String, default: '' },
    author: { type: Schema.Types.ObjectId, ref: models.AUTHOR },
    description: { type: String, default: '' },
    tags: [{ type: String, default: '' }],
    language: { type: String, default: '' },
    pages: { type: Number, default: 0 },
    version: { type: String, enum: Object.values(enums.BOOK_VERSIONS) },
    dimensions: { type: String, default: 0 },
    weight: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: models.CATEGORY },

    ISBN: { type: String, default: '' },
    publicationYear: { type: String, default: '' },
    publisher: { type: String, default: '' },

    imageSmall: { type: String, default: '' },
    imageMedium: { type: String, default: '' },
    imageLarge: { type: String, default: '' },

    totalReviews: { type: Number, default: 0 },
    averageReviews: { type: Number, default: 0 },

    wholeSalePriceHistory: [{ type: Number, default: 0 }],
    inventory: { type: Number, default: 0 },

    currentDiscount: { type: Number, default: 0 },

    relatedBooks: [{ type: Schema.Types.ObjectId, default: models.STORE_BOOK }],
    partOfBundle: [{ type: Schema.Types.ObjectId, default: models.BUNDLE }],

    price: { type: Number, default: 0 },
    rentPrice: { type: Number, default: 0 },
    membersPrice: { type: Number, default: 0 },
    membersRentPrice: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
    },
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.STORE_BOOK, schema);
