const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { enums, models } = require('./../constants');

const schema = new Schema({
    email: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.SUBSCRIBER, schema);
