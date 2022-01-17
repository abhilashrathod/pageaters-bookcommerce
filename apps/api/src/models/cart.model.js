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
    rentals: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    }],
    bundles: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      bundle: { type: Schema.Types.ObjectId, ref: models.BUNDLE },
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
