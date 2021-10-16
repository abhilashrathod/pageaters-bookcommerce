const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { enums, models } = require('./../constants');

const schema = new Schema(
  {
    planId: { type: String, default: '' }, // razorPayId

    title: { type: String, default: '' },
    description: { type: String, default: '' },

    interval: { type: Number, default: 1 },
    period: {
      type: String,
      enum: Object.values(enums.SUBSCRIPTION_PERIODS),
      default: enums.SUBSCRIPTION_PERIODS.MONTHLY,
    },

    amount: { type: Number, default: 1 },
    currency: { type: String, default: 'INR' },

    planDetails: {
      discountOnPurchase: { type: Number, default: 0 },
      freeShipping: { type: Number, default: 0 },
      maxRentals: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.SUBSCRIPTION_PLANS, schema);
