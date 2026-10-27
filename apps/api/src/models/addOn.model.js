const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
    addOnId: { type: String, default: '' },
 
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    poster: { type: String, default: '' },

    category: { type: String, default: '' },

    priority: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    currentDiscount: { type: Number, default: 0 },
    inventory: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.index({ category: 1 });

schema.plugin(mongoosePaginate);

module.exports = model(models.ADD_ON, schema);