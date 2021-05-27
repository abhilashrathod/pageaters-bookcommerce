const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    ip: { type: String },
    method: { type: String },
    originalUrl: { type: String },
    hostname: { type: String },
    message: { type: Schema.Types.Mixed },
    params: { type: Schema.Types.Mixed },
    headers: { type: Schema.Types.Mixed },
    user: { type: Schema.Types.Mixed },
    __v: { type: Number, select: false },
  },
  { timestamps: true },
);

module.exports = model(models.LOG_API, schema);
