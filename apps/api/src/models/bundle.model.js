const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
    bundleId: { type: String, default: '' },

    title: { type: String, default: '' },
    description: { type: String, default: '' },
    tags: [{ type: String, default: '' }],

    poster: { type: String, default: '' },

    currentDiscount: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },

    bundledBooks: [{ type: Schema.Types.ObjectId, ref: models.STORE_BOOK }],
    categories: [{ type: Schema.Types.ObjectId, ref: models.CATEGORY }],

    popularity: { type: Number, default: 0 },
    priority: { type: Number, default: 0 },

    price: { type: Number, default: 0 },
    membersPrice: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },

    relatedCollections: [{ type: Schema.Types.ObjectId, ref: models.COLLECTION }],
    relatedBundles: [{ type: Schema.Types.ObjectId, ref: models.BUNDLE }],
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.BUNDLE, schema);
