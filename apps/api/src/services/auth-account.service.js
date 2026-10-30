const mongoose = require('mongoose');

const { HOST } = require('../appConfig');
const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { hashOneTimeToken, safeEqual } = require('../helpers/encryption.helper');
const { revokeAllSessions } = require('./auth-session.service');
const { greetingName, sentWithin } = require('./auth-verification.service');
const { sendTemplateMail } = require('./mail.service');

// The signed-in user's profile and password, and password reset by email: a random one-time token in a link (valid
// 1 h, single use; only its hash is stored), mailed through mail.service → the email adapter. Changing or resetting
// the password ends every session of the account.

const User = mongoose.model(models.USER);

const mailResetLink = (user, token) =>
  sendTemplateMail({
    emailModule: 'FORGOT_PASSWORD',
    to: user.email,
    subject: 'Pageaters Account - Reset Password Requested',
    data: {
      FULL_NAME: greetingName(user.fullName, user.email),
      LINK: `${HOST}/auth/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`,
    },
  });

/**
 * Updates the profile and answers it (User.getProfile). Only a non-empty `fullName` is saved. The contact number is
 * not a profile field: the route's schema refuses it, since a number changes only through the OTP flow
 * (auth-verification.service), so it is always one the user proved they hold.
 * @param {{ userId: string, fullName?: string }} input
 * @returns {Promise<object | null>} The profile.
 */
const updateProfile = async ({ userId, fullName }) => {
  const fieldsToUpdate = {};
  if (fullName) fieldsToUpdate.fullName = fullName;

  await User.findOneAndUpdate({ _id: userId }, { $set: { ...fieldsToUpdate } });

  return User.getProfile(userId);
};

/**
 * Changes the password after checking the current one, then revokes every session of the account (the caller's
 * included: the user logs in again with the new password).
 * @param {{ userId: string, password: string, newPassword: string, confirmPassword: string, ipAddress?: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_PASSWORD, PASSWORDS_DO_NOT_MATCH (400).
 */
const updatePassword = async ({ userId, password, newPassword, confirmPassword, ipAddress }) => {
  const user = await User.findById(userId);

  if (!(await user.isPasswordValid(password))) throw new AppError('INVALID_PASSWORD');
  if (newPassword !== confirmPassword) throw new AppError('PASSWORDS_DO_NOT_MATCH');

  await user.setPassword(newPassword);
  await revokeAllSessions({ userId: user._id, ipAddress });
};

// Stores a fresh reset token (replacing any pending one) and mails its link.
const issueResetLink = async (user) => {
  const token = await user.generateForgotPasswordToken();
  await mailResetLink(user, token);
};

/**
 * Stores a new reset token and mails the reset link, at most once every 3 minutes.
 * @param {{ email: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} NO_USER_FOUND_FOR_THIS_EMAIL, FORGOT_PASSWORD_LIMIT_EXCEEDED (400).
 */
const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) throw new AppError('NO_USER_FOUND_FOR_THIS_EMAIL');

  if (sentWithin(user.lastForgotPasswordSentOn, 3)) throw new AppError('FORGOT_PASSWORD_LIMIT_EXCEEDED');

  await issueResetLink(user);
};

/**
 * Mails a reset link again, at most once a minute. Only the hash of a token is stored, so the link carries a fresh
 * token, which replaces the previous one (and restarts the hour).
 * @param {{ email: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} NO_USER_FOUND_FOR_THIS_EMAIL, FORGOT_PASSWORD_LIMIT_EXCEEDED (400).
 */
const resendForgotPasswordEmail = async ({ email }) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) throw new AppError('NO_USER_FOUND_FOR_THIS_EMAIL');

  if (sentWithin(user.lastForgotPasswordSentOn, 1)) throw new AppError('FORGOT_PASSWORD_LIMIT_EXCEEDED');

  await issueResetLink(user);
};

/**
 * Sets a new password with the token from the reset link. The token must match the stored hash and be under an hour
 * old; it is spent atomically before the password changes, so it works once even under concurrent requests. Every
 * session of the account is revoked.
 * @param {{ email: string, token: string, newPassword: string, confirmPassword: string, ipAddress?: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_RESET_PASSWORD_TOKEN (400; unknown email, no pending reset, wrong or expired token),
 *   PASSWORDS_DO_NOT_MATCH (400).
 */
const resetPassword = async ({ email, token, newPassword, confirmPassword, ipAddress }) => {
  const user = await User.findOne({ email, isDeleted: false }).select('+forgotPasswordTokenExpiresAt');
  if (!user || !user.forgotPasswordToken) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'NO_PENDING_RESET' });

  const hash = hashOneTimeToken(token);
  if (!safeEqual(hash, user.forgotPasswordToken)) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'TOKEN_MISMATCH' });
  if (!(user.forgotPasswordTokenExpiresAt > new Date())) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'TOKEN_EXPIRED' });
  if (newPassword !== confirmPassword) throw new AppError('PASSWORDS_DO_NOT_MATCH');

  const spent = await User.updateOne({ _id: user._id, forgotPasswordToken: hash }, { $set: { forgotPasswordToken: '', forgotPasswordTokenExpiresAt: null } });
  if (spent.modifiedCount !== 1) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'TOKEN_SPENT' });

  await user.setPassword(newPassword);
  await revokeAllSessions({ userId: user._id, ipAddress });
};

module.exports = { forgotPassword, resendForgotPasswordEmail, resetPassword, updatePassword, updateProfile };
