const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

const schema = new Schema(
  {
    from: { type: Schema.Types.Mixed },
    to: { type: Schema.Types.Mixed },
    subject: { type: Schema.Types.Mixed },
    html: { type: Schema.Types.Mixed },
    emailModule: { type: Schema.Types.Mixed },
    __v: { type: Number, select: false },
  },
  { timestamps: true, strict: false },
);

module.exports = model(models.LOG_EMAIL, schema);
