const sgMail = require('@sendgrid/mail');
const mongoose = require('mongoose');
const colors = require('colors');

const { SENDGRID_API_KEY, NO_REPLY_EMAIL } = require('./../appConfig');
const { models } = require('./../constants');

const Email = mongoose.model(models.LOG_EMAIL);

sgMail.setApiKey(SENDGRID_API_KEY);

module.exports.sendMail = async ({ to, subject, body, emailModule = '' }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const mail = {
        from: NO_REPLY_EMAIL,
        to,
        subject,
        html: body,
      };

      await sgMail.send(mail);

      await Email.create({ ...mail, emailModule });

      resolve();
    } catch (e) {
      console.log(colors.red(e));
      reject();
    }
  });
};
