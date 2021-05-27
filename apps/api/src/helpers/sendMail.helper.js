const sgMail = require('@sendgrid/mail');
const mongoose = require('mongoose');

const { SENDGRID_API_KEY, NO_REPLY_EMAIL } = require('./../appConfig');
const { models } = require('./../constants');

const Email = mongoose.model(models.LOG_EMAIL);

sgMail.setApiKey(SENDGRID_API_KEY);

module.exports.sendMail = async ({ to, subject, body, emailModule = '' }) => {
  return new Promise(async resolve => {
    const mail = {
      from: NO_REPLY_EMAIL,
      to,
      subject,
      html: body,
    };

    sgMail.send(mail);

    await Email.create({ ...mail, emailModule });

    return resolve();
  });
};
