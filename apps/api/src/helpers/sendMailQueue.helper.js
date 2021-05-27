const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const Queue = require('better-queue');

const { PROJECT_ROOT, DEFAULT_LANGUAGE, ENVIRONMENT } = require('./../appConfig');
const { sendMail } = require('./sendMail.helper');

class SendMailQueue {
  constructor() {
    if (!this.queue) {
      this.queue = new Queue(this.processElement, {
        store: {
          type: 'sql',
          dialect: 'sqlite',
          path: './queueData/sendMailQueue.sqlite',
        },
      });
    }
  }

  add(mail) {
    this.queue.push(mail);
  }

  async processElement(input, cb) {
    const { emailModule, language = DEFAULT_LANGUAGE, data, to, subject, body } = input;

    if (emailModule) {
      fs.readFile(path.join(PROJECT_ROOT, 'src', 'templates', 'email', emailModule, `${language}.html`), 'utf-8', async (e, template) => {
        if (e) {
          console.log(e);
          cb(e);
        } else {
          template = template.split('##_SEPARATOR_##');
          const subject = template[0];
          const body = template[1];

          const mail = {
            to,
            subject,
            body: parseTemplate(body, data),
            emailModule,
          };

          if (ENVIRONMENT === 'development') {
            console.log(mail);
          }

          await sendMail(mail);

          cb();
        }
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

function parseTemplate(template, dataObj) {
  return template.replace(/##_.+?_##/gi, match => {
    const path = match.substring(3, match.length - 3);

    return _.get(dataObj, path, '');
  });
}

module.exports = new SendMailQueue();
