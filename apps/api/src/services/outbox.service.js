const mongoose = require('mongoose');

const { demo, enums, models } = require('../constants');
const { env } = require('../env');
const { logger } = require('../helpers/logger.helper');
const Outbox = require('../models/outbox.model');

// The demo's in-app outbox, DEMO_MODE only: the mock e-mail and SMS adapters record each message here, and GET /outbox shows a user
// the messages addressed to them (their e-mail, or +91 and their phone number). An admin other than the demo admin
// (the super-admin) sees everyone's.

const LIST_LIMIT = 50;

/**
 * Saves one mock message in DEMO_MODE. Outside it nothing is saved: the mails carry reset and verify tokens, which
 * must never be stored where an admin could read them (mail.service.js). Never fails the send: without a database
 * connection (adapter unit tests) nothing is saved, and a failed write is only logged.
 * @param {{ channel: 'email' | 'sms', to: string, subject?: string, body: string }} message
 * @returns {Promise<void>}
 */
const record = async (message) => {
  if (!env.DEMO_MODE || mongoose.connection.readyState !== 1) return;
  try {
    await Outbox.create(message);
  } catch (error) {
    logger.error(`Outbox ${message.channel} not saved (${error.name})`);
  }
};

/**
 * The newest messages the user may read, newest first.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
const listFor = async (userId) => {
  const user = await mongoose.model(models.USER).findById(userId).select('email contactNo role').lean();
  if (!user) return [];
  const seesAll = user.role === enums.USER_ROLES.ADMIN && user.email !== demo.DEMO_ADMIN_EMAIL;
  const recipients = [user.email, user.contactNo && `+91${user.contactNo}`].filter(Boolean);
  const filter = seesAll ? {} : { to: mongoose.trusted({ $in: recipients }) };
  return Outbox.find(filter).sort({ createdAt: -1, _id: -1 }).limit(LIST_LIMIT).select('-__v').lean();
};

module.exports = { LIST_LIMIT, listFor, record };
