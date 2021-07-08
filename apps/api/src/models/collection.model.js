const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
    collectionId: { type: String, default: '' },

    title: { type: String, default: '' },
    description: { type: String, default: '' },
    tags: [{ type: String, default: '' }],

    thumbnail: { type: String, default: '' },
    poster: { type: String, default: '' },

    priority: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },

    books: [{ type: Schema.Types.ObjectId, ref: models.STORE_BOOK }],
    relatedCollections: [{ type: Schema.Types.ObjectId, ref: models.COLLECTION }],
    relatedCategories: [{ type: Schema.Types.ObjectId, ref: models.CATEGORY }],
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.COLLECTION, schema);
