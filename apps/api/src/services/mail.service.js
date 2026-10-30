const path = require('path');
const ejs = require('ejs');
const mongoose = require('mongoose');

const { PROJECT_ROOT, DEFAULT_LANGUAGE, NO_REPLY_EMAIL, HOST } = require('../appConfig');
const { models } = require('../constants');
const email = require('../adapters/email');

// Template e-mails: renders src/templates/email/<module>/<language>.ejs, sends it through the email adapter
// (src/adapters/email: mock unless EMAIL_ADAPTER=sendgrid) and records it in log_email. Replaces the in-process
// mail queue: the send is awaited before the request answers, so nothing runs after the response
// (serverless-safe, AGENTS.md §4.5).

const Email = mongoose.model(models.LOG_EMAIL);

// Render options are always passed explicitly. Called with (file, data) only, ejs reads compile options from the
// data itself (`settings['view options']`, `client`, `delimiter`…, its Express integration), so template data that
// reaches it from a request could inject code into the compiled template. With an options object it never does.
const RENDER_OPTIONS = Object.freeze({});

// Error text for logs: the error's name and code only. Vendor and template errors can quote the recipient or the
// template data, so their message is never logged.
const describe = (error) => [error?.name ?? 'Error', error?.code].filter(Boolean).join(' ');

/**
 * Renders and sends one template e-mail, then records it in log_email: `emailModule`, `to` and `subject` only
 * (the time is the record's `createdAt`; the model expires it after 30 days). The rendered html is never stored:
 * it carries reset/verify tokens and buyer details. Every template also gets `STOREFRONT_URL` (the storefront
 * origin from config, `HOST`) for its links; a `data` key of that name can't replace it. Never rejects: like the
 * legacy queue, a failure never fails the request. A render or send failure is logged as "not sent", a failed log write as "sent, not logged"; both
 * with the template name and the error's name/code only, never the recipient or the body.
 * Logging is console.error until the pino step (Phase 4 step 9).
 * @param {{ emailModule: string, to: string, subject?: string, data?: object, language?: string }} mail
 * @returns {Promise<void>}
 */
const sendTemplateMail = async ({ emailModule, to, subject, data = {}, language = DEFAULT_LANGUAGE }) => {
  const file = path.join(PROJECT_ROOT, 'src', 'templates', 'email', emailModule, `${language}.ejs`);
  let message;
  try {
    const html = await ejs.renderFile(file, { ...data, STOREFRONT_URL: HOST }, RENDER_OPTIONS);
    message = { from: NO_REPLY_EMAIL, to, subject, html };
    await email.send(message);
  } catch (error) {
    console.error(`Email ${emailModule} not sent (${describe(error)})`);
    return;
  }
  try {
    await Email.create({ emailModule, to, subject });
  } catch (error) {
    console.error(`Email ${emailModule} sent, not logged (${describe(error)})`);
  }
};

module.exports = { sendTemplateMail };
