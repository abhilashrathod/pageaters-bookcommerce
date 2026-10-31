const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

// The demo's outbox: every message the mock e-mail and SMS adapters "send" (services/outbox.service.js). The weekly
// demo cleanup empties it.
const schema = new Schema(
  {
    channel: { type: String, enum: ['email', 'sms'], required: true },
    to: { type: String, required: true, index: true },
    subject: { type: String },
    body: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = model(models.OUTBOX, schema);
