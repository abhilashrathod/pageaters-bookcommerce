const mongoose = require('mongoose');

const { hashSessionToken, verifyJwtToken } = require('./../helpers/encryption.helper');
const { models, enums } = require('./../constants');

const User = mongoose.model(models.USER);
const AccessTokens = mongoose.model(models.ACCESS_TOKEN);

// A session is valid when its JWT verifies, its access_tokens record (stored by hash) exists and is not revoked
// (logout, password change and reset revoke them), the JWT's `sessionVersion` is the account's current one (a password
// set raises it, which also ends a JWT a racing login issued), and the account is active with a permitted role.
// `req.user` is the JWT's claims (`userId`, `email`, `role`…); the account is read only for its role, status and
// session version, so no secret or stamp reaches the request.

/**
 * The active account behind a verified session JWT (see above), or why it is refused.
 * @param {unknown} accessToken The session cookie.
 * @param {{ userId?: unknown, sessionVersion?: number }} claims The verified JWT's claims.
 * @returns {Promise<{ user?: { role: string }, failure?: 'INVALID_TOKEN' | 'INVALID_USER' }>}
 */
const sessionAccount = async (accessToken, claims) => {
  const { userId } = claims;
  if (typeof accessToken !== 'string' || !mongoose.isValidObjectId(userId)) return { failure: 'INVALID_TOKEN' };

  const session = await AccessTokens.exists({ token: hashSessionToken(accessToken), userId, revoked: null });
  if (!session) return { failure: 'INVALID_TOKEN' };

  const user = await User.findOne({ _id: userId, status: enums.USER_STATUS.ACTIVE, isDeleted: false })
    .select('role sessionVersion status isDeleted')
    .lean();
  if (!user) return { failure: 'INVALID_USER' };

  if ((user.sessionVersion ?? 0) !== (claims.sessionVersion ?? 0)) return { failure: 'INVALID_TOKEN' };
  return { user };
};

/**
 * Whether the request carries a valid session of an ADMIN, for a route that needs no login but lets an admin ask for
 * more (pageLimit.middleware.js). Never answers the request: a missing or invalid session is just not an admin.
 * @param {import('express').Request} req
 * @returns {Promise<boolean>}
 */
const isAdminSession = async (req) => {
  const accessToken = req.cookies?.[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];
  if (!accessToken) return false;
  let claims;
  try {
    claims = verifyJwtToken(accessToken);
  } catch {
    return false;
  }
  const { user } = await sessionAccount(accessToken, claims);
  return user?.role === enums.USER_ROLES.ADMIN;
};

module.exports = (...permissionsRequired) => {
  return [
    // step 1:
    (req, res, next) => {
      const accessToken = req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];

      if (!accessToken) {
        return res.unauthorized('NO_AUTH_HEADER');
      }

      next();
    },
    // step 2:
    (req, res, next) => {
      const accessToken = req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];

      try {
        req.user = verifyJwtToken(accessToken);
      } catch {
        return res.unauthorized('INVALID_TOKEN');
      }
      next();
    },
    async (req, res, next) => {
      const { user, failure } = await sessionAccount(req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE], req.user);
      if (failure) {
        return res.unauthorized(failure);
      }

      // check user role and privileges
      if (user.role !== enums.USER_ROLES.ADMIN && permissionsRequired.length && !permissionsRequired.includes(user.role)) {
        return res.forbidden();
      }

      next();
    },
  ];
};

module.exports.isAdminSession = isAdminSession;
