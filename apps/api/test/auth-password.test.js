const { after, before, beforeEach, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { assertBody, captureMails, createUser, envelopes, PASSWORD, startTestApp } = require('./helpers');

// Passwords over HTTP: change (PUT /auth/password), forgot / resend / reset. Reset mails go out through the mail
// queue to SendGrid, which is mocked here to capture them. Envelopes are pinned byte for byte.

const { badRequest, okString } = envelopes;
const joiError = envelopes.badRequestObject;
// res.ok('KEY') (string form): `data` before `message`.

const User = () => mongoose.model('user');
const MINUTE = 60 * 1000;

let api;
let mailbox;
let mails;

before(async () => {
  api = await startTestApp();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  mailbox = captureMails();
  mails = mailbox.sent;
});

// Waits until the queue has sent `count` mails and logged them (the log write comes after the send), so no queue work
// is left running into the next test.
const waitForMails = async (count) => assert.equal((await mailbox.wait(count)).length, count);

const login = (email, password) => api.request('/auth/login', { method: 'POST', body: { email, password } });

describe('PUT /auth/password', () => {
  test('legacy: answers PASSWORD_UPDATED but saves the current password again, not the new one', async () => {
    const { user, cookie } = await createUser();
    const before = await User().findById(user._id);
    const body = { password: PASSWORD, newPassword: 'test-password-new', confirmPassword: 'test-password-new' };

    assertBody(await api.request('/auth/password', { method: 'PUT', body, cookie }), 200, okString('PASSWORD_UPDATED'));

    const after = await User().findById(user._id);
    assert.notEqual(after.salt, before.salt); // it was hashed again…
    assert.ok(after.isPasswordValid(PASSWORD)); // …from the old password
    assert.equal((await login(user.email, PASSWORD)).status, 200);
    assertBody(await login(user.email, 'test-password-new'), 400, badRequest('INVALID_LOGIN_ATTEMPT'));
  });

  test('a wrong current password answers INVALID_PASSWORD; a mismatched confirmation PASSWORDS_DO_NOT_MATCH', async () => {
    const { cookie } = await createUser();
    const wrong = { password: 'wrong-password', newPassword: 'a-new-one', confirmPassword: 'a-new-one' };
    assertBody(await api.request('/auth/password', { method: 'PUT', body: wrong, cookie }), 400, badRequest('INVALID_PASSWORD'));
    const mismatch = { password: PASSWORD, newPassword: 'a-new-one', confirmPassword: 'another-one' };
    assertBody(await api.request('/auth/password', { method: 'PUT', body: mismatch, cookie }), 400, badRequest('PASSWORDS_DO_NOT_MATCH'));
  });

  test('validates the payload', async () => {
    const { cookie } = await createUser();
    assertBody(await api.request('/auth/password', { method: 'PUT', body: { password: PASSWORD }, cookie }), 400, joiError('INVALID_PASSWORD'));
  });
});

describe('POST /auth/forgot-password', () => {
  test('stores a reset token, stamps the time and mails a reset link', async () => {
    const { user } = await createUser();
    assertBody(await api.request('/auth/forgot-password', { method: 'POST', body: { email: user.email } }), 200, okString('FORGOT_PASSWORD_MAIL_SENT'));

    const fresh = await User().findById(user._id);
    assert.ok(fresh.forgotPasswordToken);
    assert.ok(Date.now() - Date.parse(fresh.lastForgotPasswordSentOn) < MINUTE);

    await waitForMails(1);
    const [mail] = mails;
    assert.deepEqual(
      { from: mail.from, to: mail.to, subject: mail.subject },
      { from: 'no-reply@demo.pageaters.com', to: user.email, subject: 'Pageaters Account - Reset Password Requested' },
    );
    const link = `http://localhost:3000/auth/reset?token=${fresh.forgotPasswordToken}&amp;email=${encodeURIComponent(user.email)}`;
    assert.ok(mail.html.includes(link), 'reset link in the mail');
    assert.ok(mail.html.includes(user.fullName));
  });

  test('a second request within 3 minutes answers FORGOT_PASSWORD_LIMIT_EXCEEDED', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { lastForgotPasswordSentOn: new Date(Date.now() - 2 * MINUTE).toISOString() });
    assertBody(await api.request('/auth/forgot-password', { method: 'POST', body: { email: user.email } }), 400, badRequest('FORGOT_PASSWORD_LIMIT_EXCEEDED'));
    await User().updateOne({ _id: user._id }, { lastForgotPasswordSentOn: new Date(Date.now() - 4 * MINUTE).toISOString() });
    assert.equal((await api.request('/auth/forgot-password', { method: 'POST', body: { email: user.email } })).status, 200);
    await waitForMails(1);
  });

  test('an unknown email answers NO_USER_FOUND_FOR_THIS_EMAIL', async () => {
    assertBody(
      await api.request('/auth/forgot-password', { method: 'POST', body: { email: 'nobody@example.com' } }),
      400,
      badRequest('NO_USER_FOUND_FOR_THIS_EMAIL'),
    );
  });
});

describe('POST /auth/forgot-password/resend', () => {
  test('re-mails the stored token after a minute and stamps the time', async () => {
    const { user } = await createUser();
    const stamp = new Date(Date.now() - 2 * MINUTE).toISOString();
    await User().updateOne({ _id: user._id }, { forgotPasswordToken: 'stored-token', lastForgotPasswordSentOn: stamp });

    assertBody(
      await api.request('/auth/forgot-password/resend', { method: 'POST', body: { email: user.email } }),
      200,
      okString('FORGOT_PASSWORD_MAIL_SENT'),
    );
    const fresh = await User().findById(user._id);
    assert.equal(fresh.forgotPasswordToken, 'stored-token');
    assert.ok(fresh.lastForgotPasswordSentOn > stamp);
    await waitForMails(1);
    assert.ok(mails[0].html.includes(`token=stored-token&amp;email=${encodeURIComponent(user.email)}`));
  });

  test('within a minute answers FORGOT_PASSWORD_LIMIT_EXCEEDED; an unknown email NO_USER_FOUND_FOR_THIS_EMAIL', async () => {
    const { user } = await createUser();
    await User().updateOne({ _id: user._id }, { lastForgotPasswordSentOn: new Date().toISOString() });
    assertBody(
      await api.request('/auth/forgot-password/resend', { method: 'POST', body: { email: user.email } }),
      400,
      badRequest('FORGOT_PASSWORD_LIMIT_EXCEEDED'),
    );
    assertBody(
      await api.request('/auth/forgot-password/resend', { method: 'POST', body: { email: 'nobody@example.com' } }),
      400,
      badRequest('NO_USER_FOUND_FOR_THIS_EMAIL'),
    );
  });
});

describe('POST /auth/reset-password', () => {
  const resetToken = async (user) => {
    const doc = await User().findById(user._id);
    return doc.generateForgotPasswordToken(doc);
  };
  const reset = (body) => api.request('/auth/reset-password', { method: 'POST', body });

  test('sets the new password and clears the reset token', async () => {
    const { user } = await createUser();
    const token = await resetToken(user);
    const body = { token, email: user.email, newPassword: 'test-password-reset', confirmPassword: 'test-password-reset' };

    assertBody(await reset(body), 200, okString('PASSWORD_UPDATED'));
    const fresh = await User().findById(user._id);
    assert.equal(fresh.forgotPasswordToken, '');
    assert.equal(fresh.lastForgotPasswordSentOn, '');
    assert.equal((await login(user.email, 'test-password-reset')).status, 200);

    // The token is spent.
    assertBody(await reset(body), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));
  });

  test('rejects a bad token, another email, a token for another purpose and a mismatched confirmation', async () => {
    const { user } = await createUser();
    const other = await createUser();
    const token = await resetToken(user);
    await resetToken(other.user);
    const passwords = { newPassword: 'a-new-one', confirmPassword: 'a-new-one' };

    assertBody(await reset({ token: 'not-a-token', email: user.email, ...passwords }), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));
    assertBody(await reset({ token, email: other.user.email, ...passwords }), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));

    const verifyDoc = await User().findById(user._id);
    const verifyToken = await verifyDoc.generateVerifyEmailToken();
    assertBody(await reset({ token: verifyToken, email: user.email, ...passwords }), 400, badRequest('INVALID_RESET_PASSWORD_TOKEN'));

    assertBody(
      await reset({ token, email: user.email, newPassword: 'a-new-one', confirmPassword: 'another' }),
      400,
      badRequest('PASSWORDS_DO_NOT_MATCH'),
    );
    assert.ok((await User().findById(user._id)).isPasswordValid(PASSWORD));
  });

  test('validates the payload', async () => {
    assertBody(
      await reset({ email: 'someone@example.com', newPassword: 'a', confirmPassword: 'a' }),
      400,
      joiError('INVALID_RESET_PASSWORD_TOKEN'),
    );
  });
});
