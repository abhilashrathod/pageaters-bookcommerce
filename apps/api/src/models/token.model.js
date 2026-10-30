const { Schema, model } = require('mongoose');
const { models } = require('../constants');

// A session: the SHA-256 of the JWT a login issued (never the JWT itself). The permission middleware accepts a JWT
// only while its record exists and is not revoked; logout revokes one, a password change or reset revokes all of the
// user's. A TTL index removes each record (revoked or not) once its JWT has expired.
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // the longest JWT (admins)

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: models.USER },
  token: { type: String, default: '' },
  expires: { type: Date, default: () => new Date(Date.now() + SESSION_MAX_AGE) },
  created: { type: Date, default: Date.now },
  createdByIp: { type: String, default: '' },
  revoked: { type: Date, default: null },
  revokedByIp: { type: String, default: '' },
});

schema.index({ token: 1 });
schema.index({ userId: 1, revoked: 1 });
schema.index({ expires: 1 }, { expireAfterSeconds: 0 });

schema.virtual('isExpired').get(function() {
  return Date.now() >= this.expires;
});

schema.virtual('isActive').get(function() {
  return !this.revoked && !this.isExpired;
});

module.exports = model(models.ACCESS_TOKEN, schema);
