const crypto = require('crypto');
const mongoose = require('mongoose');
const moment = require('moment');

const { HOST } = require('../appConfig');
const { enums, models } = require('../constants');
const sms = require('../adapters/sms');
const { AppError } = require('../helpers/appError.helper');
const { hashOneTimeToken, safeEqual } = require('../helpers/encryption.helper');
const { sendTemplateMail } = require('./mail.service');

// Verification: the email address (a link with a random one-time token, valid 24 h, only its hash stored, mailed
// through mail.service → the email adapter) and the contact number (a 6-digit OTP texted through the SMS adapter to
// +91<number>: valid 10 minutes, 5 tries, at most one text a minute and OTP_SENDS_PER_DAY texts a day per user; the
// OTP and its counters are `select: false` and read explicitly here).

const User = mongoose.model(models.USER);

const MINUTE = 60 * 1000;
const OTP_TTL = 10 * MINUTE;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SENDS_PER_DAY = 5;
const DAY = 24 * 60 * MINUTE;

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
 * Verifies the email address with the token from the verification link: it must match the stored hash and be under
 * 24 hours old. The token is spent atomically and only `emailVerified` is set: the account's status never changes
 * here (a blocked account stays blocked).
 * @param {{ email: string, token: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_TOKEN (400) for an unknown email, no pending verification, a wrong, expired or spent
 *   token.
 */
const verifyEmail = async ({ email, token }) => {
  // A `+` in the link's email arrives as a space when the client does not encode it (legacy).
  const address = email.replace(/\s/g, '+');
  const user = await User.findOne({ email: address, isDeleted: false }).select('+verifyEmailTokenExpiresAt');
  if (!user || !user.verifyEmailToken) throw new AppError('INVALID_TOKEN', { debugMessage: 'NO_PENDING_VERIFICATION' });

  const hash = hashOneTimeToken(token);
  if (!safeEqual(hash, user.verifyEmailToken)) throw new AppError('INVALID_TOKEN', { debugMessage: 'TOKEN_MISMATCH' });
  if (!(user.verifyEmailTokenExpiresAt > new Date())) throw new AppError('INVALID_TOKEN', { debugMessage: 'TOKEN_EXPIRED' });

  const verified = await User.updateOne(
    { _id: user._id, verifyEmailToken: hash },
    { $set: { verifyEmailToken: '', verifyEmailTokenExpiresAt: null, lastVerifyEmailSentOn: '', emailVerified: true } },
  );
  if (verified.modifiedCount !== 1) throw new AppError('INVALID_TOKEN', { debugMessage: 'TOKEN_SPENT' });
};

/**
 * Stores a fresh verification token (replacing any pending one) and mails the link, at most once a minute, for an
 * active account whose email is not verified yet.
 * Legacy, kept: the mail greets the email's local part even when the account has a name.
 * @param {{ email: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} NO_USER_FOUND_FOR_THIS_EMAIL (400; also for an account already verified or not active),
 *   VERIFY_EMAIL_LIMIT_EXCEEDED (400).
 */
const resendVerificationEmail = async ({ email }) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user || user.emailVerified || user.status !== enums.USER_STATUS.ACTIVE) throw new AppError('NO_USER_FOUND_FOR_THIS_EMAIL');

  if (sentWithin(user.lastVerifyEmailSentOn, 1)) throw new AppError('VERIFY_EMAIL_LIMIT_EXCEEDED');

  const token = await user.generateVerifyEmailToken();

  await sendTemplateMail({
    emailModule: 'REGISTRATION',
    to: user.email,
    subject: 'Pageaters Account - Greetings from Pageaters!',
    data: {
      FULL_NAME: greetingName('', user.email),
      LINK: `${HOST}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`,
    },
  });
};

// Takes one text from the user's allowance in a single conditional update, so parallel requests cannot share one:
// it matches only when the last text is over a minute old and the 24-hour window has room (an ended window starts a new
// one). `fields` are written with it. Answers the updated user (with `contactOtp`), or null when no text is allowed.
// Every server-built filter operator is marked trusted, one by one (sanitizeFilter neutralises untrusted ones).
const takeTextAllowance = (filter, fields = {}) => {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - MINUTE).toISOString();
  const dayAgo = new Date(now.getTime() - DAY);
  const windowEnded = { $lte: [{ $ifNull: ['$contactOtpSendWindowStart', new Date(0)] }, dayAgo] };
  const literals = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { $literal: value }]));

  return User.findOneAndUpdate(
    {
      ...filter,
      $and: [
        { $or: [{ lastMessageSentOn: null }, { lastMessageSentOn: '' }, { lastMessageSentOn: mongoose.trusted({ $lt: minuteAgo }) }] },
        {
          $or: [
            { contactOtpSendWindowStart: null },
            { contactOtpSendWindowStart: mongoose.trusted({ $lte: dayAgo }) },
            { contactOtpSendCount: mongoose.trusted({ $lt: OTP_SENDS_PER_DAY }) },
          ],
        },
      ],
    },
    [
      {
        $set: {
          contactOtpSendWindowStart: { $cond: [windowEnded, now, '$contactOtpSendWindowStart'] },
          contactOtpSendCount: { $cond: [windowEnded, 1, { $add: [{ $ifNull: ['$contactOtpSendCount', 0] }, 1] }] },
          lastMessageSentOn: { $literal: now.toISOString() },
          ...literals,
        },
      },
    ],
    { new: true },
  ).select('+contactOtp');
};

/**
 * Stores a new contact number with a random 6-digit OTP (crypto.randomInt; valid 10 minutes, 5 tries) and texts the
 * OTP to it, within the text allowance (one a minute, OTP_SENDS_PER_DAY a day, taken atomically). The OTP is stored
 * before the text, so a failed text still leaves it stored.
 * @param {{ userId: string, contactNo: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} RESEND_OTP_LIMIT_EXCEEDED (400) within a minute of the last text or past the daily texts; the
 *   SMS adapter's error when the text fails (→ 500).
 */
const sendContactVerification = async ({ userId, contactNo }) => {
  const verificationCode = String(crypto.randomInt(100000, 1000000));
  const user = await takeTextAllowance(
    { _id: userId },
    {
      contactOtp: verificationCode,
      contactOtpExpiresAt: new Date(Date.now() + OTP_TTL),
      contactOtpAttempts: 0,
      contactNo,
      contactVerified: false,
    },
  );
  if (!user) throw new AppError('RESEND_OTP_LIMIT_EXCEEDED');

  await sms.send({ to: `+91${contactNo}`, body: otpText(user.fullName, user.email, verificationCode) });
};

/**
 * Texts the pending OTP again (its expiry is unchanged), within the text allowance.
 * @param {{ userId: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CONTACT_VERIFICATION_NOT_EXIST (no OTP, or it expired), RESEND_OTP_LIMIT_EXCEEDED (400).
 */
const resendContactVerification = async ({ userId }) => {
  const pending = await User.findOne({ _id: userId }).select('+contactOtp +contactOtpExpiresAt');
  if (!pending.contactOtp || !(pending.contactOtpExpiresAt > new Date())) throw new AppError('CONTACT_VERIFICATION_NOT_EXIST');

  const user = await takeTextAllowance({ _id: userId, contactOtp: pending.contactOtp });
  if (!user) throw new AppError('RESEND_OTP_LIMIT_EXCEEDED');

  await sms.send({ to: `+91${user.contactNo}`, body: otpText(user.fullName, user.email, user.contactOtp) });
};

/**
 * Checks the OTP in constant time. Each check spends one of the OTP's 5 tries first (atomically, so parallel guesses
 * count too); an expired OTP or one out of tries is cleared. On a match the number is marked verified and the OTP and
 * its stamp are cleared.
 * @param {{ userId: string, otp: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} CONTACT_VERIFICATION_NOT_EXIST (no OTP pending), OTP_VERIFICATION_FAILED (400; wrong, expired or
 *   out of tries).
 */
const verifyContact = async ({ userId, otp }) => {
  const clearOtp = { contactOtp: '', contactOtpExpiresAt: null, contactOtpAttempts: 0 };
  const pending = await User.findOne({ _id: userId }).select('+contactOtp');
  if (!pending.contactOtp) throw new AppError('CONTACT_VERIFICATION_NOT_EXIST');

  const user = await User.findOneAndUpdate(
    // Each server-built operator is marked trusted: sanitizeFilter neutralises untrusted ones (wrapping the whole
    // filter is not enough).
    {
      _id: userId,
      contactOtp: mongoose.trusted({ $ne: '' }),
      contactOtpExpiresAt: mongoose.trusted({ $gt: new Date() }),
      contactOtpAttempts: mongoose.trusted({ $lt: OTP_MAX_ATTEMPTS }),
    },
    { $inc: { contactOtpAttempts: 1 } },
    { new: true },
  ).select('+contactOtp +contactOtpAttempts');

  if (!user) {
    await User.updateOne({ _id: userId, contactOtp: pending.contactOtp }, { $set: clearOtp });
    throw new AppError('OTP_VERIFICATION_FAILED', { debugMessage: 'OTP_EXPIRED_OR_EXHAUSTED' });
  }

  if (!safeEqual(otp, user.contactOtp)) {
    if (user.contactOtpAttempts >= OTP_MAX_ATTEMPTS) await User.updateOne({ _id: userId, contactOtp: user.contactOtp }, { $set: clearOtp });
    throw new AppError('OTP_VERIFICATION_FAILED');
  }

  const verified = await User.updateOne(
    { _id: userId, contactOtp: user.contactOtp },
    { $set: { ...clearOtp, contactVerified: true, lastMessageSentOn: '' } },
  );
  if (verified.modifiedCount !== 1) throw new AppError('OTP_VERIFICATION_FAILED');
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
