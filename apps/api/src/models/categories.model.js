const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { enums, models } = require('./../constants');

const schema = new Schema({
    categoryId: { type: String, default: '' },

    title: { type: String, default: '' },
    description: { type: String, default: '' },

    thumbnail: { type: String, default: '' },
    poster: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.CATEGORY, schema);
