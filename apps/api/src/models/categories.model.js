const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
    categoryId: { type: String, default: '' },

    title: { type: String, default: '' },
    description: { type: String, default: '' },

    thumbnail: { type: String, default: '' },

    priority: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.CATEGORY, schema);
