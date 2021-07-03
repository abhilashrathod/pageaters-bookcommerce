const { Schema, model } = require('mongoose');
const { models } = require('../constants');

const schema = new Schema({
  account: { type: Schema.Types.ObjectId, ref: models.USER },
  token: { type: String, default: '' },
  expires: { type: Date, default: new Date() },
  created: { type: Date, default: Date.now() },
  createdByIp: {type: String, default: ''},
  revoked: { type: Date, default: null },
  revokedByIp: { type: String, default: '' }
});

schema.virtual('isExpired').get(function() {
  return Date.now() >= this.expires;
});

schema.virtual('isActive').get(function() {
  return !this.revoked && !this.isExpired;
});

module.exports = model(models.REFRESH_TOKEN, schema);
