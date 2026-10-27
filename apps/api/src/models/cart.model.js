const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: models.USER },
    products: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    }],
    addOns: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      addOn: { type: Schema.Types.ObjectId, ref: models.ADD_ON },
    }],
    bundles: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      bundle: { type: Schema.Types.ObjectId, ref: models.BUNDLE },
    }],
    mysteryBoxes: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      preferences: {
        preferredAuthors: { type: String, default: '' },
        preferredGenres: { type: String, default: '' },
        favoriteBooks: { type: String, default: '' },
        ignoredBooks: { type: String, default: '' },
      },
      box: { type: Schema.Types.ObjectId, ref: models.MYSTERY_BOX },
    }],
    subTotal: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
    },
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.CART, schema);
