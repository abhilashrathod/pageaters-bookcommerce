const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { API_URL } = require('./../appConfig');

const { enums, models } = require('./../constants');

const schema = new Schema({
    bundleId: { type: String, default: '' },

    title: { type: String, default: '' },
    description: { type: String, default: '' },
    tags: [{ type: String, default: '' }],

    currentDiscount: { type: Number, default: 0 },

    bundledBooks: [{ type: Schema.Types.ObjectId, default: models.STORE_BOOK }],

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

module.exports = model(models.BUNDLE, schema);
