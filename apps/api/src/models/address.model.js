const { Schema, model } = require('mongoose');

const { enums, models } = require('./../constants');

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: models.USER },

    country: { type: 'String', default: 'IN' },
    city: { type: 'String', default: '' },
    state: { type: 'String', default: '' },

    fullName: { type: 'String', default: '' },
    contactNo: { type: 'String', default: '' },
    pinCode: { type: 'String', default: '' },

    addressLine1: { type: 'String', default: '' },
    addressLine2: { type: 'String', default: '' },
    landmark: { type: 'String', default: '' },

    deliveryInstructions: { type: 'String', default: '' },
    type: { type: String, enum: Object.values(enums.ADDRESS_TYPES), default: enums.ADDRESS_TYPES.HOME },
  },
  {
    timestamps: true,
  },
);

module.exports = model(models.ADDRESS, schema);
