const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: models.USER },
    deviceId: { type: String, default: '' },
    fcmToken: { type: String, default: '' },
    source: { type: String, default: '' },
    __v: { type: Number, select: false },
  },
  { timestamps: true },
);

module.exports = model(models.DEVICE, schema);
