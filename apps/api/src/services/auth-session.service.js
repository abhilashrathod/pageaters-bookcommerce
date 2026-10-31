const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { generateJwtToken, hashPassword, hashSessionToken } = require('../helpers/encryption.helper');

// Sessions: signup, login, token revoke and the profile a session reads. Services return the token and cart id;
// the controller sets the cookies.
//
// A session is a JWT (7 days for shoppers, 30 for admins, signed with the `jwt` subkey of ENCRYPTION_KEY,
// helpers/encryption.helper.js) whose SHA-256 is stored in access_tokens. The permission middleware accepts it only
// while that record is not revoked and its `sessionVersion` claim is the account's: logout revokes one; a password
// change or reset revokes all of the user's and raises the version, which also ends a JWT a racing login signed.

// The seeded demo shopper (seed/src/accounts.ts DEMO_SHOPPER_EMAIL), signed in by demoLogin.
const DEMO_SHOPPER_EMAIL = 'shopper@demo.pageaters.com';

const User = mongoose.model(models.USER);
const AccessTokens = mongoose.model(models.ACCESS_TOKEN);
const Cart = mongoose.model(models.CART);
const Favorites = mongoose.model(models.FAVORITES);

// Signs a session token for the user and stores its hash, with the JWT's own expiry (the TTL index removes it then).
const startSession = async (user, ipAddress) => {
  const { token, payload } = generateJwtToken(user, ipAddress);
  const days = user.role === enums.USER_ROLES.ADMIN ? 30 : 7;
  await AccessTokens.create({
    ...payload,
    token: hashSessionToken(token),
    expires: new Date(payload.createdAt + days * 24 * 60 * 60 * 1000),
  });
  return token;
};

/**
 * Creates a shopper account with its cart, favourites and a session. No mail is sent (the verification mail goes
 * out only on resend), so the verification token stored here is never mailed.
 * @param {{ email: string, password: string, ipAddress: string }} input
 * @returns {Promise<{ token: string, cartId: import('mongoose').Types.ObjectId }>}
 * @throws {AppError} USER_ALREADY_REGISTERED (400).
 */
const register = async ({ email, password, ipAddress }) => {
  if (!(await User.isEmailAvailable(email))) throw new AppError('USER_ALREADY_REGISTERED');

  const user = await User.create({ email, role: enums.USER_ROLES.USER });

  await user.setPassword(password);
  await user.generateVerifyEmailToken();

  const cart = await Cart.create({ user: user._id });
  await Favorites.create({ userId: user._id });

  const token = await startSession(user, ipAddress);
  return { token, cartId: cart._id };
};

/**
 * Logs an active account in: checks the password in constant time, upgrades a legacy or weaker hash to today's
 * scrypt, stamps the login time, starts a session and finds the cart. An unknown email (or a wrong password, whatever
 * the stored hash) costs one scrypt hash, so response time does not tell accounts apart.
 * The rehash and the stamp are written only while the stored hash is still the one checked: a login that overlaps a
 * password change or reset fails instead of writing the old password back, and a JWT it signs after the change
 * carries the old `sessionVersion`, which the middleware refuses.
 * @param {{ email: string, password: string, ipAddress: string }} input
 * @returns {Promise<{ token: string, cartId: import('mongoose').Types.ObjectId | '', profile: object }>} `cartId` is
 *   '' for an account without a cart; `profile` is User.getProfile's projection.
 * @throws {AppError} INVALID_LOGIN_ATTEMPT (400) for an unknown or inactive account or a wrong password.
 */
const login = async ({ email, password, ipAddress }) => {
  const user = await User.findOne({ email, status: enums.USER_STATUS.ACTIVE, isDeleted: false }).select('+sessionVersion');
  if (!user) {
    await hashPassword(password);
    throw new AppError('INVALID_LOGIN_ATTEMPT', { debugMessage: 'INVALID_USER' });
  }

  const { valid, needsRehash } = await user.checkPassword(password);
  if (!valid) throw new AppError('INVALID_LOGIN_ATTEMPT', { debugMessage: 'INVALID_PASSWORD' });

  const update = { lastLoginAt: new Date().toISOString() };
  if (needsRehash) Object.assign(update, { password: await hashPassword(password), salt: '' });
  const written = await User.updateOne({ _id: user._id, password: user.password }, { $set: update });
  if (written.matchedCount !== 1) throw new AppError('INVALID_LOGIN_ATTEMPT', { debugMessage: 'PASSWORD_CHANGED' });

  const token = await startSession(user, ipAddress);

  const profile = await User.getProfile(user._id);
  const cart = await Cart.findOne({ user: profile._id });

  return { token, cartId: cart ? cart._id : '', profile };
};

/**
 * Signs into the seeded demo shopper without a password (DEMO_MODE only; the route is hidden otherwise).
 * @param {{ ipAddress: string }} input
 * @returns {Promise<{ token: string, cartId: import('mongoose').Types.ObjectId | '', profile: object }>} As login.
 * @throws {AppError} DEMO_SHOPPER_MISSING (503) when the seed hasn't been loaded.
 */
const demoLogin = async ({ ipAddress }) => {
  const user = await User.findOne({ email: DEMO_SHOPPER_EMAIL, status: enums.USER_STATUS.ACTIVE, isDeleted: false }).select('+sessionVersion');
  if (!user) throw new AppError('DEMO_SHOPPER_MISSING', { status: 503 });

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date().toISOString() } });
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

  const accessToken = await AccessTokens.findOne({ token: hashSessionToken(token), userId });
  if (!accessToken) throw new AppError('TOKEN_UNMATCHED', { status: 401 });

  accessToken.revoked = Date.now();
  accessToken.revokedByIp = ipAddress;
  await accessToken.save();
};

/**
 * Revokes every open session of the user (after a password change or reset) and raises the account's
 * `sessionVersion`, so a JWT signed in the meantime is refused too.
 * @param {{ userId: string | import('mongoose').Types.ObjectId, ipAddress?: string }} input
 * @returns {Promise<void>}
 */
const revokeAllSessions = async ({ userId, ipAddress = '' }) => {
  await User.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });
  await AccessTokens.updateMany({ userId, revoked: null }, { $set: { revoked: new Date(), revokedByIp: ipAddress } });
};

/**
 * The user's profile: the account without secrets, stamps, role or status (User.getProfile).
 * @param {string} userId
 * @returns {Promise<object | null>}
 */
const getProfile = (userId) => User.getProfile(userId);

module.exports = { demoLogin, getProfile, login, register, revokeAllSessions, revokeToken };
