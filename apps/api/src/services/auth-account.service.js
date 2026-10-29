const mongoose = require('mongoose');

const { HOST } = require('../appConfig');
const { models } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { decrypt } = require('../helpers/encryption.helper');
const sendMailQueue = require('../helpers/sendMailQueue.helper');
const { greetingName, sentWithin } = require('./auth-verification.service');

// The signed-in user's profile and password, and password reset by email (an encrypted token in a link, mailed
// through the mail queue → SendGrid).

const User = mongoose.model(models.USER);

const mailResetLink = (user, token) =>
  sendMailQueue.add({
    emailModule: 'FORGOT_PASSWORD',
    to: user.email,
    subject: 'Pageaters Account - Reset Password Requested',
    data: {
      FULL_NAME: greetingName(user.fullName, user.email),
      LINK: `${HOST}/auth/reset?token=${token}&email=${encodeURIComponent(user.email)}`,
    },
  });

/**
 * Updates the profile and answers it (User.getProfile).
 * Legacy, kept: only a non-empty `fullName` is saved; `contactNo` passes the validator but is ignored (numbers change
 * only through contact verification).
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
 * Changes the password after checking the current one.
 * Legacy bug, kept (fixed in its own PLAN.md step): it saves `password` (the current one) again, with a new salt,
 * instead of `newPassword` — the password never changes.
 * @param {{ userId: string, password: string, newPassword: string, confirmPassword: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_PASSWORD, PASSWORDS_DO_NOT_MATCH (400).
 */
const updatePassword = async ({ userId, password, newPassword, confirmPassword }) => {
  const user = await User.findById(userId);

  if (!user.isPasswordValid(password)) throw new AppError('INVALID_PASSWORD');
  if (newPassword !== confirmPassword) throw new AppError('PASSWORDS_DO_NOT_MATCH');

  await user.setPassword(password);
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

  const token = await user.generateForgotPasswordToken(user);
  mailResetLink(user, token);
};

/**
 * Mails the stored reset link again, at most once a minute, and stamps the time. Legacy: it re-sends whatever
 * token is stored (none, if no reset was requested).
 * @param {{ email: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} NO_USER_FOUND_FOR_THIS_EMAIL, FORGOT_PASSWORD_LIMIT_EXCEEDED (400).
 */
const resendForgotPasswordEmail = async ({ email }) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) throw new AppError('NO_USER_FOUND_FOR_THIS_EMAIL');

  if (sentWithin(user.lastForgotPasswordSentOn, 1)) throw new AppError('FORGOT_PASSWORD_LIMIT_EXCEEDED');

  user.lastForgotPasswordSentOn = new Date().toISOString();
  await user.save();

  mailResetLink(user, user.forgotPasswordToken);
};

/**
 * Sets a new password with the token from the reset link; setting it clears the stored token, so a link works once.
 * @param {{ email: string, token: string, newPassword: string, confirmPassword: string }} input
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_RESET_PASSWORD_TOKEN (400; undecryptable, no pending reset, another user or email,
 *   another purpose), PASSWORDS_DO_NOT_MATCH (400).
 */
const resetPassword = async ({ email, token, newPassword, confirmPassword }) => {
  let tokenData;
  try {
    tokenData = JSON.parse(decrypt(token));
  } catch {
    throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'CANNOT_DECRYPT_TOKEN' });
  }

  const user = await User.findOne({ email: tokenData.email, forgotPasswordToken: { $ne: '' }, isDeleted: false });

  if (!user) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'USER_NOT_FOUND' });
  if (user._id.toString() !== tokenData.userId) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'USER_ID_NOT_VALID' });
  if (user.email !== email) throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'EMAIL_NOT_VALID' });
  if (tokenData.motive !== 'FORGOT_PASSWORD') throw new AppError('INVALID_RESET_PASSWORD_TOKEN', { debugMessage: 'INCORRECT_MOTIVE' });
  if (newPassword !== confirmPassword) throw new AppError('PASSWORDS_DO_NOT_MATCH');

  await user.setPassword(newPassword);
};

module.exports = { forgotPassword, resendForgotPasswordEmail, resetPassword, updatePassword, updateProfile };
