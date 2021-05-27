const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    name: { type: String, default: '' },
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    __v: { type: Number, select: false },
  },
  { timestamps: true },
);

module.exports = model(models.API_CLIENT, schema);
