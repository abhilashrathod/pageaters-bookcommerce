const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema(
  {
    creditId: { type: String, default: '' },
    orderId: { type: Schema.Types.ObjectId, ref: models.ORDER },
    userId: { type: Schema.Types.ObjectId, ref: models.USER },
    amount: { type: Number, default: 0 },
    action: { type: String, default: '' }, // credit or debit 
    expired: { type: Boolean, default: false },
    expiredAt: { type: String, default: '' },
  },
  { timestamps: true },
);


schema.plugin(mongoosePaginate);

module.exports = model(models.STORE_CREDIT_TRANSACTIONS, schema);