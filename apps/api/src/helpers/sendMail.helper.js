const sgMail = require('@sendgrid/mail');
const mongoose = require('mongoose');
const { styleText } = require('node:util');

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
      console.log(styleText('red', String(JSON.stringify(e))));
      reject();
    }
  });
};
