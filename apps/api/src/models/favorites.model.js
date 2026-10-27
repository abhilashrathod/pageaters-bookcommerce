const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: models.USER },
    wishlist: [{ type: Schema.Types.ObjectId, ref: models.STORE_BOOK }],
    deals: [{ type: Schema.Types.ObjectId, ref: models.STORE_DEALS }],
    collections: [{ type: Schema.Types.ObjectId, ref: models.COLLECTION }],
    bundles: [{ type: Schema.Types.ObjectId, ref: models.BUNDLE }],
  },
  { timestamps: true },
);

module.exports = model(models.FAVORITES, schema);
