const { Schema, model } = require('mongoose');

const { models } = require('./../constants');

// How long a sent-email record is kept. MongoDB's TTL monitor removes a record once `createdAt` is older than
// this (it runs about once a minute, so removal can lag a little).
const EMAIL_LOG_TTL_DAYS = 30;

// A record of one sent template e-mail: which template, to whom, the subject and when (createdAt). Never the
// rendered body: it held reset and verify links with their tokens, buyer names, addresses and order totals.
// `strict` drops any other field a caller passes.
const schema = new Schema(
  {
    emailModule: { type: String },
    to: { type: String },
    subject: { type: String },
    __v: { type: Number, select: false },
  },
  { timestamps: true, strict: true },
);

schema.index({ createdAt: 1 }, { expireAfterSeconds: EMAIL_LOG_TTL_DAYS * 24 * 60 * 60 });

module.exports = model(models.LOG_EMAIL, schema);
