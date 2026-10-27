const { Schema, model } = require('mongoose');
const paginate = require("mongoose-paginate-v2");

const { models } = require('./../constants');

const schema = new Schema({
    setId: { type: String, default: '' },

    products: [{
      priority: { type: Number, default: 0 },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK }
    }],

    categories: [{ type: Schema.Types.ObjectId, ref: models.CATEGORY }],

    slug: { type: String, default: '' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },

    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.plugin(paginate);

module.exports = model(models.PRODUCT_SETS, schema);
