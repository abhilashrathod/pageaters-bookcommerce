const { Schema, model } = require('mongoose');

const { enums, models } = require('./../constants');

const schema = new Schema({
    slug: { type: String, default: '' },

    data: [{ type: Schema.Types.Mixed }],

    categories: [{ type: Schema.Types.ObjectId, ref: models.CATEGORY }],

    title: { type: String, default: '' },
    description: { type: String, default: '' },

    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

module.exports = model(models.PAGE, schema);
