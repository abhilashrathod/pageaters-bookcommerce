const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: models.USER }, // can be blank for non-registered user and object for registered user
    products: [{
      quantity: { type: Number, default: 1 },
      addedOn: { type: String, default: '' },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    }],
    rentals: [{
      quantity: { type: Number, default: 1 },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    }],
    subTotal: { type: Number, default: 0 },
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
