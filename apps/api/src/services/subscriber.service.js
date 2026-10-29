const mongoose = require('mongoose');

const { models } = require('../constants');

// Newsletter subscribers (an email address each).

const Subscriber = mongoose.model(models.SUBSCRIBER);

/**
 * One page of subscribers. Legacy: without `limit` the page has no documents.
 * @param {{ page?: number | string, limit?: number | string }} paging
 * @returns {Promise<object>} The mongoose-paginate-v2 result.
 */
const listSubscribers = ({ page, limit }) => Subscriber.paginate({}, { page, limit });

/**
 * Signs an email up unless it already is.
 * @param {string} email
 * @returns {Promise<boolean>} true when added, false when it was already signed up.
 */
const addSubscriber = async (email) => {
  if (await Subscriber.findOne({ email })) return false;
  await Subscriber.create({ email });
  return true;
};

module.exports = { addSubscriber, listSubscribers };
