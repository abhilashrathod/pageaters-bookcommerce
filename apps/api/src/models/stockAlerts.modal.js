const { Schema, model } = require('mongoose');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const { enums, models } = require('./../constants');

const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: models.USER },
    product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.plugin(aggregatePaginate);

module.exports = model(models.STOCK_ALERT, schema);
