const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    method: { type: String },
    path: { type: String },
    statusCode: { type: Number },
    milliSecondsTaken: { type: Number },
    isDeleted: { type: Boolean, default: false },
    __v: { type: Number, select: false },
  },
  { timestamps: true },
);

module.exports = model(models.PERF_API, schema);
