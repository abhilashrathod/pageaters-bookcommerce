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

// The credit a cancel or a full refund gives back is one row per order (`RF-<order _id>`, order-fulfilment
// recordStoreCreditReturn): unique among `RF-` ids only. `CR-`/`SC-` ids are random digits and are not covered, so
// legacy data can't violate the index. Range bounds, because a partial filter can't use a regex ('.' follows '-').
schema.index(
  { creditId: 1 },
  { name: 'one_refund_credit_per_order', unique: true, partialFilterExpression: { creditId: { $gte: 'RF-', $lt: 'RF.' } } },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.STORE_CREDIT_TRANSACTIONS, schema);