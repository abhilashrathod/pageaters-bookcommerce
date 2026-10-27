const mongoose = require('mongoose');

const { models } = require('./../constants');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const User = mongoose.model(models.USER);

module.exports.hardDeleteUser = async (req, res) => {
  try {
    const { emails } = req.allParams();

    for (const email of emails) {
      await User.deleteMany({ email });
    }

    return res.ok();
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getQueueStats = async (req, res) => {
  try {
    return res.ok({ data: { sendMailQueue: sendMailQueue.queue.getStats() } });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.sendMail = async (req, res) => {
  try {
    const { email, subject, body } = req.allParams();

    sendMailQueue.add({ to: email, subject, body });

    return res.ok();
  } catch (e) {
    return res.internalServerError(e);
  }
};
