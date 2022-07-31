const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { enums, models } = require('./../constants');

const schema = new Schema({
    bookId: { type: String, default: '' },
    title: { type: String, default: '' },
    tagline: { type: String, default: '' },
    eyebrow: { type: String, default: '' },
    author: { type: Schema.Types.ObjectId, ref: models.AUTHOR },
    description: { type: String, default: '' },
    tags: [{ type: String, default: '' }],

    language: { type: String, default: '' },
    pages: { type: Number, default: 0 },
    readingLevel: { type: String, enum: Object.values(enums.READING_LEVEL), default: enums.READING_LEVEL.BEGINNER },
    version: { type: String, enum: Object.values(enums.BOOK_VERSIONS) },

    dimensions: { type: String, default: '' },
    weight: { type: Number, default: 0 },

    ISBN: { type: String, default: '' },
    publicationYear: { type: String, default: '' },
    publisher: { type: String, default: '' },

    editorsPick: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    newRelease: { type: Boolean, default: false },

    poster: { type: String, default: '' },

    totalReviews: { type: Number, default: 0 },
    averageReviews: { type: Number, default: 0 },

    wholeSalePriceHistory: [{ type: Number, default: 0 }],
    inventory: { type: Number, default: 0 },

    currentDiscount: { type: Number, default: 0 },

    popularity: { type: Number, default: 0 },

    categories: [{ type: Schema.Types.ObjectId, ref: models.CATEGORY }],
    relatedBooks: [{ type: Schema.Types.ObjectId, ref: models.STORE_BOOK }],
    relatedBundles: [{ type: Schema.Types.ObjectId, ref: models.BUNDLE }],
    relatedCollections: [{ type: Schema.Types.ObjectId, ref: models.COLLECTION }],

    price: { type: Number, default: 0 },
    rentPrice: { type: Number, default: 0 },
    membersPrice: { type: Number, default: 0 },
    membersRentPrice: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.STORE_BOOK, schema);
