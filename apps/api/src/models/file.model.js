const { Schema, model } = require('mongoose');

const { models, enums } = require('./../constants');

const schema = new Schema(
  {
    fileName: { type: String, default: '', trim: true},
    fileModule: { type: String, enum: Object.values(enums.FILE_MODULES), default: enums.FILE_MODULES.DEFAULT },
    fileUrl: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    __v: { type: Number, select: false },
  },
  {
    timestamps: true,
  },
);

module.exports = model(models.FILE, schema);
