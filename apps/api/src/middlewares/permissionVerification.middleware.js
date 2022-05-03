const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { ENCRYPTION_KEY } = require('./../appConfig');
const { models, enums } = require('./../constants');

const User = mongoose.model(models.USER);
const AccessTokens = mongoose.model(models.ACCESS_TOKEN);

const SELECTION_STRING = '-isDeleted -createdAt -updatedAt -salt -password -forgotPasswordToken -verifyEmailToken -forgotPasswordToken -lastPasswordSetAt -lastLoginAt -notifications -razorPayCustId';

module.exports = (...permissionsRequired) => {
  return [
    // step 1:
    (req, res, next) => {
      // const refreshToken = req.cookies[enums.TOKEN_ID.REFRESH_TOKEN_COOKIE];
      const accessToken = req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];

      if (!accessToken) {
        return res.unauthorized('NO_AUTH_HEADER');
      }

      next();
    },
    // step 2:
    (req, res, next) => {
      const accessToken = req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];

      jwt.verify(accessToken, ENCRYPTION_KEY, (err, data) => {
        if (err) {
          return res.unauthorized('INVALID_TOKEN');
        }
        req.user = data;
        next();
      });
    },
    async (req, res, next) => {
      const { userId, createdByIp } = req.user;
      const ipAddress = req.ip;

      const user = await User.findOne({ _id: userId, status: enums.USER_STATUS.ACTIVE, isDeleted: false }).select(SELECTION_STRING);

      // if no user then send back
      if (!user) {
        return res.unauthorized('INVALID_USER');
      }

      // if the token is accessed via another IP address then issued one
      // if (createdByIp !== ipAddress) {
      //   console.error('Ip mismatch');
      //   return res.unauthorized('INVALID_TOKEN');
      // }

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

      const tokens = await AccessTokens.find({ account: userId });
      req.user.ownsToken = token => !!tokens.find(x => x.token === token);

      next();
    },
  ];

};
