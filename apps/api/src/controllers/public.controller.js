const { CONTACT_US_EMAIL } = require('./../appConfig');

const sendMailQueue = require('./../helpers/sendMailQueue.helper');

module.exports.contactUs = async (req, res) => {
  try {
    const { name, email, message } = req.allParams();

    sendMailQueue.add({
      to: CONTACT_US_EMAIL,
      subject: 'New contact',
      body: `New contact from: ${name} (${email}).<br> Message: ${message}`,
    });

    return res.ok('MAIL_SENT');
  } catch (e) {
    return res.internalServerError(e);
  }
};
