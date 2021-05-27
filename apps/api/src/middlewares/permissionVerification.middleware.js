const mongoose = require('mongoose');

const { models } = require('./../constants');
const { decrypt } = require('./../helpers/encryption.helper');

const User = mongoose.model(models.USER);

module.exports = (...permissionsRequired) => {
  return async (req, res, next) => {
    const authHeader = req.get('authorization');

    if (!authHeader) {
      return res.unauthorized('NO_AUTH_HEADER');
    }

    let decoded;

    try {
      decoded = decrypt(authHeader);
    } catch (e) {
      return res.unauthorized('INVALID_AUTH_HEADER');
    }

    const token = JSON.parse(decoded);

    const { userId } = token;

    const user = await User.findOne({
      _id: userId,
      status: 'ACTIVE',
    }).select(
      '-invitationCode -isDeleted -createdAt -updatedAt -salt -password -forgotPasswordToken -verifyEmailToken -lastverifyEmailSentOn -lastForgotPasswordSentOn',
    );

    if (!user) {
      return res.unauthorized('INVALID_USER');
    }

    if (req.method === 'GET' && (req.path === '/me' || req.path === '/recoverAccount')) {
      //
    } else {
      if (!user.emailVerified) {
        return res.unauthorized('EMAIL_VERIFICATION_PENDING');
      }

      if (user.scheduledForDeletion) {
        return res.unauthorized('SCHEDULED_FOR_DELETION');
      }

      if (user.allowAuthTokenGeneratedAfter && new Date(token.createdAt).toISOString() > user.allowAuthTokenGeneratedAfter) {
        return res.unauthorized('TOKEN_EXPIRED');
      }
    }

    if (user.role === 'SUPER_USER') {
      //
    } else if (permissionsRequired.length) {
      if (!permissionsRequired.includes(user.role)) {
        console.log(`permissionsRequired: ${permissionsRequired}`);
        console.log(`user.role: ${user.role}`);

        return res.forbidden();
      }
    }

    req.token = token;
    req.user = user;

    next();
  };
};
