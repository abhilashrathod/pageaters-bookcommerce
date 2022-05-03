const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const Queue = require('better-queue');
const colors = require('colors');
const ejs = require('ejs');

const { PROJECT_ROOT, DEFAULT_LANGUAGE, ENVIRONMENT } = require('./../appConfig');
const { sendMail } = require('./sendMail.helper');

class SendMailQueue {
  constructor() {
    if (!this.queue) {
      this.queue = new Queue(this.processElement);
    }
  }

  add(mail) {
    this.queue.push(mail)
      .on('finish', function() {
        console.log(colors.green('Task succeeded'));
      })
      .on('failed', function() {
        console.log(colors.red(' Task failed!'));
      });
  }

  async processElement(input, cb) {
    const { emailModule, language = DEFAULT_LANGUAGE, data, to, subject, body } = input;

    if (emailModule) {
      let emailTemplate;
      ejs
        .renderFile(path.join(PROJECT_ROOT, 'src', 'templates', 'email', emailModule, `${language}.ejs`), { ...data })
        .then(async (result) => {
          emailTemplate = result;
          const message = {
            to,
            subject,
            emailModule,
            body: emailTemplate,
          };

          await sendMail(message);

          cb();
        })
        .catch(err => {
          console.log(JSON.stringify("err > > > >", err));
          cb(err);
        });
    } else {
      const mail = { to, subject, body };

      if (ENVIRONMENT === 'development') {
        console.log(mail);
      }

      await sendMail(mail);

      cb();
    }
  }
}

module.exports = new SendMailQueue();
