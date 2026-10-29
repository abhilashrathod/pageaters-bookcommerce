const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateJwtToken } = require('../helpers/encryption.helper');

// Sessions: signup, login, token revoke and the profile a session reads. Services return the token and cart id;
// the controller sets the cookies.
//
// A session is a JWT (7 days for shoppers, 30 for admins, helpers/encryption.helper.js) that is also stored in
// access_tokens. Legacy: the permission middleware checks only the JWT, so a revoked token keeps working until it
// expires.

const User = mongoose.model(models.USER);
const AccessTokens = mongoose.model(models.ACCESS_TOKEN);
const Cart = mongoose.model(models.CART);
const Favorites = mongoose.model(models.FAVORITES);

// Signs a session token for the user and stores it.
const startSession = async (user, ipAddress) => {
  const { token, payload } = generateJwtToken(user, ipAddress);
  await AccessTokens.create({ ...payload, token });
  return token;
};

/**
 * Creates a shopper account with its cart, favourites and a session. No mail is sent (the verification mail goes
 * out only on resend). Legacy: the last save of the new user is not awaited.
 * @param {{ email: string, password: string, ipAddress: string }} input
 * @returns {Promise<{ token: string, cartId: import('mongoose').Types.ObjectId }>}
 * @throws {AppError} USER_ALREADY_REGISTERED (400).
 */
const register = async ({ email, password, ipAddress }) => {
  if (!(await User.isEmailAvailable(email))) throw new AppError('USER_ALREADY_REGISTERED');

  const user = await User.create({ email, role: enums.USER_ROLES.USER });

  await user.setPassword(password);
  const verifyToken = await user.generateVerifyEmailToken();

  user.verifyEmailToken = verifyToken;
  user.lastVerifyEmailSentOn = new Date().toISOString();
  user.save();

  const cart = await Cart.create({ user: user._id });
  await Favorites.create({ userId: user._id });

  const token = await startSession(user, ipAddress);
  return { token, cartId: cart._id };
};

/**
 * Logs an active account in: stamps the login time (legacy: not awaited), starts a session and finds the cart.
 * @param {{ email: string, password: string, ipAddress: string }} input
 * @returns {Promise<{ token: string, cartId: import('mongoose').Types.ObjectId | '', profile: object }>} `cartId` is
 *   '' for an account without a cart; `profile` is User.getProfile's projection.
 * @throws {AppError} INVALID_LOGIN_ATTEMPT (400) for an unknown or inactive account or a wrong password.
 */
const login = async ({ email, password, ipAddress }) => {
  const user = await User.findOne({ email, status: enums.USER_STATUS.ACTIVE });
  if (!user) throw new AppError('INVALID_LOGIN_ATTEMPT', { debugMessage: 'INVALID_USER' });
  if (!user.isPasswordValid(password)) throw new AppError('INVALID_LOGIN_ATTEMPT', { debugMessage: 'INVALID_PASSWORD' });

  user.lastLoginAt = new Date().toISOString();
  user.save();

  const token = await startSession(user, ipAddress);

  const profile = await User.getProfile(user._id);
  const cart = await Cart.findOne({ user: profile._id });

  return { token, cartId: cart ? cart._id : '', profile };
};

/**
 * Revokes the user's own session token (stamps `revoked` and `revokedByIp`).
 * @param {{ token?: string, userId: string, ipAddress: string }} input `token` from the session cookie.
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_TOKEN (401) without a token; TOKEN_UNMATCHED (401) when the user has no such stored
 *   token.
 */
const revokeToken = async ({ token, userId, ipAddress }) => {
  if (!token) throw new AppError('INVALID_TOKEN', { status: 401 });

  const accessToken = await AccessTokens.findOne({ token, userId });
  if (!accessToken) throw new AppError('TOKEN_UNMATCHED', { status: 401 });

  accessToken.revoked = Date.now();
  accessToken.revokedByIp = ipAddress;
  await accessToken.save();
};

/**
 * The user's profile: the account without secrets, stamps, role or status (User.getProfile).
 * @param {string} userId
 * @returns {Promise<object | null>}
 */
const getProfile = (userId) => User.getProfile(userId);

module.exports = { getProfile, login, register, revokeToken };
