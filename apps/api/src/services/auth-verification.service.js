const mongoose = require('mongoose');
const moment = require('moment');

const { HOST } = require('../appConfig');
const { models } = require('../constants');
const sms = require('../adapters/sms');
const { AppError } = require('../helpers/appError.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');
const { sendTemplateMail } = require('./mail.service');

// Verification: the email address (a link with an encrypted token, mailed through mail.service → the email adapter)
// and the contact number (a 6-digit OTP texted through the SMS adapter to +91<number>).

const User = mongoose.model(models.USER);

/**
 * How mails and texts address the user: the full name, else the local part of the email.
 * @param {string} name
 * @param {string} email
 * @returns {string}
 */
const greetingName = (name, email) => `${name ? name : email.split('@')[0]}`;

const otpText = (name, email, code) => `Hi ${greetingName(name, email)}, Pageaters verification code: ${code}`;

/**
 * Whether `stamp` (an ISO string, '' when never sent) is within the last `minutes` (the resend limits).
 * @param {string | undefined} stamp
 * @param {number} minutes
 * @returns {unknown} Truthy when it is.
 */
const sentWithin = (stamp, minutes) => stamp && stamp >= moment().subtract(minutes, 'm').toDate().toISOString();

/**
 * Verifies the email address with the token from the verification link (User.verifyEmail), which marks the account
 * verified and active and clears the token.
 * @param {{ email: string, token: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_TOKEN (400) for an undecryptable token, a token of another user or email, another
 *   purpose, or an account without a pending token.
 */
const verifyEmail = async ({ email, token }) => {
  const result = await User.verifyEmail(email, token);
  // User.verifyEmail fails only with INVALID_TOKEN; `false` is the legacy debug message.
  if (!result.success) throw new AppError('INVALID_TOKEN', { debugMessage: result.success });
};

/**
 * Stores a fresh verification token and mails the link.
 * Legacy bug, kept: the resend limit reads `lastverifyEmailSentOn` (misspelt, never set), so there is no limit; the
 * mail greets the email's local part even when the account has a name.
 * @param {{ email: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} NO_USER_FOUND_FOR_THIS_EMAIL, VERIFY_EMAIL_LIMIT_EXCEEDED (400).
 */
const resendVerificationEmail = async ({ email }) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) throw new AppError('NO_USER_FOUND_FOR_THIS_EMAIL');

  if (sentWithin(user.lastverifyEmailSentOn, 1)) throw new AppError('VERIFY_EMAIL_LIMIT_EXCEEDED');

  const token = await user.generateVerifyEmailToken();

  await sendTemplateMail({
    emailModule: 'REGISTRATION',
    to: user.email,
    subject: 'Pageaters Account - Greetings from Pageaters!',
    data: {
      FULL_NAME: greetingName('', user.email),
      LINK: `${HOST}/auth/verify?token=${token}&email=${encodeURIComponent(user.email)}`,
    },
  });
};

/**
 * Stores a new contact number with a random 6-digit OTP (Math.random, legacy) and texts the OTP to it. The user is
 * saved without awaiting (legacy), so a failed text still leaves the OTP stored.
 * @param {{ userId: string, contactNo: string }} input
 * @returns {Promise<void>}
 * @throws the SMS adapter's error when the text fails (→ 500).
 */
const sendContactVerification = async ({ userId, contactNo }) => {
  const verificationCode = generateRandomNumber(6);

  const user = await User.findOne({ _id: userId });

  user.lastMessageSentOn = new Date().toISOString();
  user.contactOtp = verificationCode;
  user.contactNo = contactNo;
  user.contactVerified = false;
  user.save();

  await sms.send({ to: `+91${contactNo}`, body: otpText(user.fullName, user.email, verificationCode) });
};

/**
 * Texts the pending OTP again, at most once a minute, and stamps the time (saved without awaiting, legacy).
 * @param {{ userId: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CONTACT_VERIFICATION_NOT_EXIST, RESEND_OTP_LIMIT_EXCEEDED (400).
 */
const resendContactVerification = async ({ userId }) => {
  const user = await User.findOne({ _id: userId });

  if (!user.contactOtp) throw new AppError('CONTACT_VERIFICATION_NOT_EXIST');
  if (sentWithin(user.lastMessageSentOn, 1)) throw new AppError('RESEND_OTP_LIMIT_EXCEEDED');

  user.lastMessageSentOn = new Date().toISOString();
  user.save();

  await sms.send({ to: `+91${user.contactNo}`, body: otpText(user.fullName, user.email, user.contactOtp) });
};

/**
 * Checks the OTP; on a match marks the number verified and clears the OTP and its stamp.
 * @param {{ userId: string, otp: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CONTACT_VERIFICATION_NOT_EXIST, OTP_VERIFICATION_FAILED (400).
 */
const verifyContact = async ({ userId, otp }) => {
  const user = await User.findOne({ _id: userId });

  if (!user.contactOtp) throw new AppError('CONTACT_VERIFICATION_NOT_EXIST');
  if (user.contactOtp !== otp) throw new AppError('OTP_VERIFICATION_FAILED');

  user.contactVerified = true;
  user.lastMessageSentOn = '';
  user.contactOtp = '';
  await user.save();
};

module.exports = {
  greetingName,
  sentWithin,
  resendContactVerification,
  resendVerificationEmail,
  sendContactVerification,
  verifyContact,
  verifyEmail,
};
