const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema(
  {
    dealId: { type: String, default: '' },
    poster: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    priority: { type: Number, default: 0 },
    productSets: [{
      priority: { type: Number, default: 0 },
      set: { type: Schema.Types.ObjectId, ref: models.PRODUCT_SETS },
    }],
    categories: [{ type: Schema.Types.ObjectId, ref: models.CATEGORY }],
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: String, default: '' },
  },
  { timestamps: true },
);


schema.plugin(mongoosePaginate);

module.exports = model(models.STORE_DEALS, schema);
