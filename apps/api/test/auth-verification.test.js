const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { createUser, mockVendorCall, startTestApp } = require('./helpers');
const t = require('../src/locales/en.json');

// Verification over HTTP: email verification (verify + resend, mailed through SendGrid) and contact-number OTPs
// (send / resend / verify, texted through Twilio). Both vendors are mocked to capture what would be sent.

const ok = (status, data) => ({ statusCode: 200, status, message: t[status], data });
const okString = (status) => ({ statusCode: 200, status, data: {}, message: t[status] });
const badRequest = (status) => ({ statusCode: 400, status, error: t[status], message: t[status], data: {} });
const joiError = (status) => ({ statusCode: 400, status, message: t[status], error: t[status], data: {} });
const unauthorized = (key) => ({ statusCode: 401, status: 'UNAUTHORIZED', message: t[key], data: {}, error: t[key] });

const assertBody = (res, status, body) => {
  assert.equal(res.status, status);
  assert.equal(JSON.stringify(res.body), JSON.stringify(body));
};

const User = () => mongoose.model('user');
const MINUTE = 60 * 1000;

let api;
let mails;
let texts;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  // res.error() writes its request log (log_api) without awaiting it; let the last one land before the client closes.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  mails = [];
  texts = [];
  mockVendorCall('sendgrid.send', (mail) => {
    mails.push(mail);
  });
  mockVendorCall('twilio.messages.create', (message) => {
    texts.push(message);
    return { sid: 'SM-test' };
  });
});

// Waits until the queue has sent and logged `count` mails, so no queue work runs into the next test.
const waitForMails = async (count) => {
  const logged = () => mongoose.model('log_email').countDocuments();
  for (let i = 0; i < 100 && (mails.length < count || (await logged()) < count); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(mails.length, count);
};

// The user model's own unawaited saves (send/resend OTP) land shortly after the response.
const userWhen = async (id, check) => {
  for (let i = 0; i < 50; i += 1) {
    const user = await User().findById(id);
    if (check(user)) return user;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail('user state not reached in time');
};

describe('POST /auth/verify-email', () => {
  const verifyToken = async (id) => (await User().findById(id)).generateVerifyEmailToken();

  test('verifies the email with the token from signup and clears it', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { emailVerified: false });
    const token = await verifyToken(user._id);

    assertBody(await api.request('/auth/verify-email', { method: 'POST', body: { email: user.email, token } }), 200, okString('EMAIL_VERIFIED'));
    const fresh = await User().findById(user._id);
    assert.deepEqual([fresh.emailVerified, fresh.verifyEmailToken, fresh.lastVerifyEmailSentOn], [true, '', '']);
  });

  test('a bad token, another email, a spent token or a reset token answer INVALID_TOKEN', async () => {
    const { user } = await createUser();
    const other = await createUser();
    const token = await verifyToken(user._id);
    const verify = (body) => api.request('/auth/verify-email', { method: 'POST', body });

    assertBody(await verify({ email: user.email, token: 'not-a-token' }), 400, badRequest('INVALID_TOKEN'));
    assertBody(await verify({ email: other.user.email, token }), 400, badRequest('INVALID_TOKEN'));
    const doc = await User().findById(user._id);
    const resetToken = await doc.generateForgotPasswordToken(doc);
    assertBody(await verify({ email: user.email, token: resetToken }), 400, badRequest('INVALID_TOKEN'));

    assert.equal((await verify({ email: user.email, token })).status, 200);
    assertBody(await verify({ email: user.email, token }), 400, badRequest('INVALID_TOKEN'));
  });

  test('validates the payload', async () => {
    assertBody(await api.request('/auth/verify-email', { method: 'POST', body: { email: 'someone@example.com' } }), 400, joiError('INVALID_TOKEN'));
  });
});

describe('POST /auth/verify-email/resend', () => {
  test('mails a fresh verification link and answers SUCCESS', async () => {
    const { user } = await createUser();
    const res = await api.request('/auth/verify-email/resend', { method: 'POST', body: { email: user.email } });

    // res.ok() with no argument: the object form with the defaults.
    assertBody(res, 200, ok('SUCCESS', {}));
    const fresh = await User().findById(user._id);
    assert.ok(fresh.verifyEmailToken);
    await waitForMails(1);
    const [mail] = mails;
    assert.deepEqual(
      { from: mail.from, to: mail.to, subject: mail.subject },
      { from: 'no-reply@demo.pageaters.com', to: user.email, subject: 'Pageaters Account - Greetings from Pageaters!' },
    );
    const link = `http://localhost:3000/auth/verify?token=${fresh.verifyEmailToken}&amp;email=${encodeURIComponent(user.email)}`;
    assert.ok(mail.html.includes(link), 'verification link in the mail');
    // Addressed by the email's local part, never the name (legacy).
    assert.ok(mail.html.includes(user.email.split('@')[0]));
  });

  test('legacy: there is no resend limit (the check reads a misspelt field)', async () => {
    const { user } = await createUser();
    const resend = () => api.request('/auth/verify-email/resend', { method: 'POST', body: { email: user.email } });
    assert.equal((await resend()).status, 200);
    await waitForMails(1);
    assert.equal((await resend()).status, 200);
    await waitForMails(2);
  });

  test('an unknown email answers NO_USER_FOUND_FOR_THIS_EMAIL', async () => {
    assertBody(
      await api.request('/auth/verify-email/resend', { method: 'POST', body: { email: 'nobody@example.com' } }),
      400,
      badRequest('NO_USER_FOUND_FOR_THIS_EMAIL'),
    );
  });
});

describe('POST /auth/contact/send', () => {
  test('stores a 6-digit OTP with the number and texts it to +91<number>', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactVerified: true });

    const res = await api.request('/auth/contact/send', { method: 'POST', body: { contactNo: '9000000042' }, cookie });

    assertBody(res, 200, ok('CONTACT_VERIFICATION_INITIATED', {}));
    const fresh = await userWhen(user._id, (u) => u.contactOtp);
    assert.match(fresh.contactOtp, /^[1-9]\d{5}$/);
    assert.deepEqual([fresh.contactNo, fresh.contactVerified], ['9000000042', false]);
    assert.ok(Date.now() - Date.parse(fresh.lastMessageSentOn) < MINUTE);
    assert.deepEqual(texts, [{ body: `Hi ${user.fullName}, Pageaters verification code: ${fresh.contactOtp}`, from: undefined, to: '+919000000042' }]);
  });

  test('a user without a name is greeted by the email local part', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { fullName: '' });
    await api.request('/auth/contact/send', { method: 'POST', body: { contactNo: '9000000042' }, cookie });
    assert.match(texts[0].body, new RegExp(`^Hi ${user.email.split('@')[0]}, Pageaters verification code: \\d{6}$`));
  });

  test('a failed text answers 500 but the OTP is already stored', async () => {
    const { user, cookie } = await createUser();
    mockVendorCall('twilio.messages.create', () => {
      throw new Error('Twilio down');
    });
    const res = await api.request('/auth/contact/send', { method: 'POST', body: { contactNo: '9000000042' }, cookie });
    assert.equal(res.status, 500);
    await userWhen(user._id, (u) => u.contactOtp);
  });

  test('validates the number before the session check', async () => {
    assertBody(await api.request('/auth/contact/send', { method: 'POST', body: { contactNo: '12' } }), 400, joiError('INVALID_PHONE'));
    assertBody(await api.request('/auth/contact/send', { method: 'POST', body: { contactNo: '9000000042' } }), 401, unauthorized('NO_AUTH_HEADER'));
  });
});

describe('POST /auth/contact/resend', () => {
  test('re-texts the stored OTP after a minute and stamps the time', async () => {
    const { user, cookie } = await createUser();
    const stamp = new Date(Date.now() - 2 * MINUTE).toISOString();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', contactNo: '9000000043', lastMessageSentOn: stamp });

    assertBody(await api.request('/auth/contact/resend', { method: 'POST', cookie }), 200, okString('CONTACT_VERIFICATION_INITIATED'));
    assert.deepEqual(texts, [{ body: `Hi ${user.fullName}, Pageaters verification code: 123456`, from: undefined, to: '+919000000043' }]);
    await userWhen(user._id, (u) => u.lastMessageSentOn > stamp);
  });

  test('within a minute answers RESEND_OTP_LIMIT_EXCEEDED; without an OTP CONTACT_VERIFICATION_NOT_EXIST', async () => {
    const { user, cookie } = await createUser();
    assertBody(await api.request('/auth/contact/resend', { method: 'POST', cookie }), 400, badRequest('CONTACT_VERIFICATION_NOT_EXIST'));
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', lastMessageSentOn: new Date().toISOString() });
    assertBody(await api.request('/auth/contact/resend', { method: 'POST', cookie }), 400, badRequest('RESEND_OTP_LIMIT_EXCEEDED'));
    assert.deepEqual(texts, []);
  });
});

describe('POST /auth/contact/verify', () => {
  test('the right OTP verifies the number and clears the OTP', async () => {
    const { user, cookie } = await createUser();
    await User().updateOne({ _id: user._id }, { contactOtp: '123456', lastMessageSentOn: new Date().toISOString() });

    assertBody(await api.request('/auth/contact/verify', { method: 'POST', body: { otp: '123456' }, cookie }), 200, okString('OTP_VERIFICATION_SUCCESS'));
    const fresh = await User().findById(user._id);
    assert.deepEqual([fresh.contactVerified, fresh.contactOtp, fresh.lastMessageSentOn], [true, '', '']);
  });

  test('a wrong OTP answers OTP_VERIFICATION_FAILED; no OTP CONTACT_VERIFICATION_NOT_EXIST', async () => {
    const { user, cookie } = await createUser();
    const verify = (otp) => api.request('/auth/contact/verify', { method: 'POST', body: { otp }, cookie });
    assertBody(await verify('123456'), 400, badRequest('CONTACT_VERIFICATION_NOT_EXIST'));
    await User().updateOne({ _id: user._id }, { contactOtp: '123456' });
    assertBody(await verify('654321'), 400, badRequest('OTP_VERIFICATION_FAILED'));
    assert.equal((await User().findById(user._id)).contactVerified, false);
  });

  test('validates the OTP', async () => {
    const { cookie } = await createUser();
    assertBody(await api.request('/auth/contact/verify', { method: 'POST', body: { otp: '12' }, cookie }), 400, joiError('INVALID_OTP'));
  });
});
