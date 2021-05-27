const { Schema, model } = require('mongoose');

const { models, enums } = require('../constants');

const schema = new Schema(
  {
    to: { type: Schema.Types.ObjectId, ref: models.USER },
    source: { type: String },
    title: { type: String },
    description: { type: String },
    notificationType: { type: String, enum: Object.values(enums.NOTIFICATION_TYPES), default: enums.NOTIFICATION_TYPES.MISCELLANEOUS },
    status: { type: String, enum: Object.values(enums.NOTIFICATION_STATUS), default: enums.NOTIFICATION_STATUS.WAITING_FOR_DELIVERY },
    __v: { type: Number, select: false },
  },
  { timestamps: true, strict: false },
);

module.exports = model(models.LOG_PUSH_NOTIFICAION, schema);
