const mongoose = require('mongoose');
const jwt = require('express-jwt');

const { ENCRYPTION_KEY } = require('./../appConfig');
const { models, enums } = require('./../constants');

const User = mongoose.model(models.USER);
const RefreshToken = mongoose.model(models.REFRESH_TOKEN);

const SELECTION_STRING = '-isDeleted -createdAt -updatedAt -salt -password -forgotPasswordToken -verifyEmailToken -forgotPasswordToken -lastPasswordSetAt -lastLoginAt -notifications -razorPayCustId';

module.exports = (...permissionsRequired) => {
  return [
    // step 1:
    (req, res, next) => {
      const authHeader = req.get('authorization');

      if (!authHeader) {
        return res.unauthorized('NO_AUTH_HEADER');
      }

      next();
    },
    // step 2:
    jwt({ secret: ENCRYPTION_KEY, algorithms: ['HS256'] }),
    // step 3:
    (err, req, res, next) => {
      if (err.name === 'UnauthorizedError') {
        return res.unauthorized('TOKEN_EXPIRED');
      }
      next();
    },
    // step 4:
    async (req, res, next) => {
      const { userId } = req.user;

      const user = await User.findOne({ _id: userId, status: enums.USER_STATUS.ACTIVE, isDeleted: false }).select(SELECTION_STRING);

      // if no user then send back
      if (!user) {
        return res.unauthorized('INVALID_USER');
      }

      // if scheduled for deletion send back
      if (user.scheduledForDeletion) {
        return res.unauthorized('SCHEDULED_FOR_DELETION');
      }

      // check user role and privileges
      if (user.role === enums.USER_ROLES.ADMIN) {
        //
      } else if (permissionsRequired.length) {
        if (!permissionsRequired.includes(user.role)) {
          console.log(`permissionsRequired: ${permissionsRequired}`);
          console.log(`user.role: ${user.role}`);

          return res.forbidden();
        }
      }

      const tokens = await RefreshToken.find({ account: userId });
      req.user.ownsToken = token => !!tokens.find(x => x.token === token);

      next();
    },
  ];

};
