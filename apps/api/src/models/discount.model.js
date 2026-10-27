const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    discountId: { type: String, default: '' },
    validity: {
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
    },

    isEnabled: { type: String, default: '' },
    code: { type: String, default: '' },
    type: { type: String, enum: Object.values(enums.DISCOUNT_TYPES), default: '' },
    discountPercent: { type: Number, default: 0 },
    discountAmount:  { type: Number, default: 0 },

    conditions: {
      customerId: { type: Schema.Types.ObjectId, ref: models.USER },
      minThreshold: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

module.exports = model(models.DISCOUNT, schema);
