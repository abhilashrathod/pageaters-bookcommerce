const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId },
    clientSecret: { type: 'String' },
    enabled: { type: 'Boolean', default: true },
    __v: { type: 'Number', select: false },
  },
  { timestamps: true },
);

module.exports = model(models.API_CLIENT, schema);
