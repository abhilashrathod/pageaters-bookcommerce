const mongoose = require('mongoose');
const { get } = require('lodash');

const { models, enums } = require('../constants');
const { handleControllerError } = require('../helpers/appError.helper');
const { encrypt } = require('../helpers/encryption.helper');
const authAccount = require('../services/auth-account.service');
const authSession = require('../services/auth-session.service');
const authVerification = require('../services/auth-verification.service');

// Thin controller: read the request, call one service, answer with the res.* helpers (src/services/README.md).
// Services return tokens and ids; this controller owns the session and cart cookies.
//
// deleteAccount and recoverAccount are left here as they were (they still use the user model directly): both are
// removed in a later step (owner decision 2026-10-29).

const User = mongoose.model(models.USER);

// Legacy: `expires` is computed once, when this module loads, so every session cookie a process sets expires
// 30 days after the process started (the JWT itself lasts 7 days, 30 for admins).
const ACCESS_TOKEN_OPTIONS = {
  httpOnly: true,
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
};

const REVOKED_COOKIE_OPTIONS = {
  httpOnly: true,
  expires: 0,
};

const userIdOf = (req) => get(req, 'user.userId', '');

// Sets the session and cart cookies. The cart id is an ObjectId, so Express writes it as JSON (`j:"<id>"`, legacy).
const setSessionCookies = (res, { token, cartId }) => {
  res.cookie(enums.TOKEN_ID.ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_OPTIONS);
  res.cookie(enums.TOKEN_ID.CART_COOKIE, cartId, CART_COOKIE_OPTIONS);
};

module.exports.register = async (req, res) => {
  try {
    const { email, password } = req.validated;
    const session = await authSession.register({ email, password, ipAddress: req.ip });
    setSessionCookies(res, session);
    return res.ok({ message: 'REGISTRATION_SUCCESS', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.validated;
    const { profile, ...session } = await authSession.login({ email, password, ipAddress: req.ip });
    setSessionCookies(res, session);
    return res.ok({ message: profile.emailVerified ? 'LOGIN_SUCCESS' : 'EMAIL_VERIFICATION_PENDING', data: profile });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.revokeToken = async (req, res) => {
  try {
    const token = req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];
    await authSession.revokeToken({ token, userId: userIdOf(req), ipAddress: req.ip });
    res.cookie(enums.TOKEN_ID.ACCESS_TOKEN_COOKIE, '', REVOKED_COOKIE_OPTIONS);
    res.cookie(enums.TOKEN_ID.CART_COOKIE, '', REVOKED_COOKIE_OPTIONS);
    return res.ok({ message: 'TOKEN_REVOKED', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.me = async (req, res) => {
  try {
    const data = await authSession.getProfile(req.user.userId);
    return res.ok({ message: 'ME_SUCCESS', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

// Not routed (POST /auth/logout revokes the token); kept as it was.
module.exports.logout = async (req, res) => res.ok('LOGOUT_SUCCESS');

module.exports.updateProfile = async (req, res) => {
  try {
    const { fullName } = req.allParams();
    const data = await authAccount.updateProfile({ userId: req.user.userId, fullName });
    return res.ok({ message: 'PROFILE_UPDATED', data });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.updatePassword = async (req, res) => {
  try {
    const { password, newPassword, confirmPassword } = req.allParams();
    await authAccount.updatePassword({ userId: userIdOf(req), password, newPassword, confirmPassword });
    return res.ok('PASSWORD_UPDATED');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.validated;
    await authAccount.forgotPassword({ email });
    return res.ok('FORGOT_PASSWORD_MAIL_SENT');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.resendForgetPasswordEmail = async (req, res) => {
  try {
    const { email } = req.validated;
    await authAccount.resendForgotPasswordEmail({ email });
    return res.ok('FORGOT_PASSWORD_MAIL_SENT');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.validated;
    await authAccount.resetPassword({ email, token, newPassword, confirmPassword });
    return res.ok('PASSWORD_UPDATED');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.validated;
    await authVerification.verifyEmail({ email, token });
    return res.ok('EMAIL_VERIFIED');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.validated;
    await authVerification.resendVerificationEmail({ email });
    return res.ok();
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.sendContactVerification = async (req, res) => {
  try {
    const { contactNo } = req.allParams();
    await authVerification.sendContactVerification({ userId: userIdOf(req), contactNo });
    return res.ok({ message: 'CONTACT_VERIFICATION_INITIATED', data: {} });
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.resendContactVerification = async (req, res) => {
  try {
    await authVerification.resendContactVerification({ userId: userIdOf(req) });
    return res.ok('CONTACT_VERIFICATION_INITIATED');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.verifyContact = async (req, res) => {
  try {
    const { otp } = req.allParams();
    await authVerification.verifyContact({ userId: userIdOf(req), otp });
    return res.ok('OTP_VERIFICATION_SUCCESS');
  } catch (e) {
    return handleControllerError(res, e);
  }
};

module.exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.allParams();
    let { user } = req;

    user = await User.findOne({ _id: user._id, isDeleted: false });

    if (!user.isPasswordValid(password)) {
      return res.error('INVALID_PASSWORD');
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.scheduledForDeletion = true;
    await user.save();

    return res.ok('ACCOUNT_DELETED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.recoverAccount = async (req, res) => {
  try {
    const { user } = req;

    if (!user.scheduledForDeletion) {
      return res.error('ACCOUNT_ALREADY_ACTIVE');
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.scheduledForDeletion = false;
    await user.save();

    const token = encrypt(JSON.stringify({ userId: user._id, createdAt: Date.now() }));

    return res.ok({ message: 'ACCOUNT_RECOVERED', data: { user, token } });
  } catch (e) {
    return res.internalServerError(e);
  }
};
