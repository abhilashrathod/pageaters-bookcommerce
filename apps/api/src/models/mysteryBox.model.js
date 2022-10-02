const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
  boxId: { type: String, default: '' },

  title: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: [{ type: String, default: '' }],

  images: [{ type: String, default: '' }],

  currentDiscount: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  inventory: { type: Number, default: 0 },

  price: { type: Number, default: 0 },
  books: { type: Number, default: 0 },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: String, default: '' },
  }, {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.MYSTERY_BOX, schema);
