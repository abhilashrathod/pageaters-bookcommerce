const mongoose = require('mongoose');

const { mockVendorCall } = require('./stubs');

/**
 * Captures the e-mails the app hands to SendGrid (the in-process mail queue renders and sends them after the
 * response). Call it in each test (or in beforeEach after api.reset()) before the request. `await mails.wait(n)`
 * before the test ends: it returns once `n` mails were sent and logged (the queue writes a log_email row after each
 * send), or after 5 s, so no queued work outlives api.reset() and fails on the cleared mock.
 * @returns {{ sent: object[], wait: (count: number) => Promise<object[]> }}
 */
const captureMails = () => {
  const sent = [];
  mockVendorCall('sendgrid.send', (mail) => {
    sent.push(mail);
    return [{ statusCode: 202 }];
  });
  const logged = () => mongoose.model('log_email').countDocuments();
  const wait = async (count) => {
    const deadline = Date.now() + 5000;
    while ((sent.length < count || (await logged()) < count) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return sent;
  };
  return { sent, wait };
};

module.exports = { captureMails };
