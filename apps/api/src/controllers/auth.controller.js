const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');

const { HOST, PROJECT_ROOT } = require('./../appConfig');
const { models } = require('../constants');

const { encrypt, decrypt } = require('../helpers/encryption.helper');
const { writeFile } = require('./../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const User = mongoose.model(models.USER);

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.allParams();

    let user = await User.findOne({ email, status: 'ACTIVE' });

    if (!user) {
      return res.error('INVALID_LOGIN_ATTEMPT', 'INVALID_USER');
    }

    if (!user.isPasswordValid(password)) {
      return res.error('INVALID_LOGIN_ATTEMPT', 'INVALID_PASSWORD');
    }

    const token = user.generateAuthToken();

    user = await User.getProfile(user._id);

    if (!user.emailVerified) {
      return res.ok({ message: 'EMAIL_VERIFICATION_PENDING', data: { user, token } });
    }

    return res.ok({ message: 'LOGIN_SUCCESS', data: { user, token } });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.logout = async (req, res) => {
  try {
    return res.ok('LOGOUT_SUCCESS');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.register = async (req, res) => {
  try {
    let { email, password, name, telephone, role } = req.allParams();

    const isEmailAvailable = await User.isEmailAvailable(email);

    if (!isEmailAvailable) {
      return res.error('EMAIL_UNAVAILABLE');
    }

    const user = await User.create({ role, email, name, telephone });

    await user.setPassword(password);

    const token = await user.generateVerifyEmailToken();

    sendMailQueue.add({
      emailModule: 'REGISTRATION',
      to: user.email,
      data: {
        LINK: `${HOST}/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`,
      },
    });

    return res.ok('REGISTRATION_SUCCESS');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.me = async (req, res) => {
  try {
    let { user } = req;

    user = await User.getProfile(user._id);

    return res.ok({ message: 'ME_SUCCESS', data: user });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, telephone } = req.allParams();
    let { user } = req;

    const fieldsToUpdate = {};

    if (firstName) {
      fieldsToUpdate.firstName = firstName;
    }

    if (lastName) {
      fieldsToUpdate.lastName = lastName;
    }

    if (telephone) {
      fieldsToUpdate.telephone = telephone;
    }

    // update user
    await User.findByIdAndUpdate(user._id, fieldsToUpdate);

    user = await User.getProfile(user._id);

    return res.ok({ message: 'PROFILE_UPDATED', data: { user } });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.updatePassword = async (req, res) => {
  try {
    let { password, newPassword, confirmPassword } = req.allParams();
    let { user } = req;

    user = await User.findById(user._id);

    if (!user.isPasswordValid(password)) {
      return res.error('INVALID_PASSWORD');
    }

    if (newPassword !== confirmPassword) {
      return res.error('PASSWORDS_DO_NOT_MATCH');
    }

    await user.setPassword(password);

    return res.ok('PASSWORD_UPDATED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.allParams();

    const user = await User.findOne({ email, status: 'ACTIVE', isDeleted: false });

    if (!user) {
      return res.error('NO_USER_FOUND_FOR_THIS_EMAIL');
    }

    const limitExceeded =
      user.lastForgotPasswordSentOn &&
      user.lastForgotPasswordSentOn >=
        moment()
          .subtract(30, 'm')
          .toDate()
          .toISOString();

    if (limitExceeded) {
      return res.error('FORGOT_PASSWORD_LIMIT_EXCEEDED');
    }

    const token = await user.generateForgotPasswordToken();

    sendMailQueue.add({
      emailModule: 'FORGOT_PASSWORD',
      to: user.email,
      data: {
        LINK: `${HOST}/auth/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`,
      },
    });

    return res.ok('FORGOT_PASSWORD_MAIL_SENT');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.verifyEmail = async (req, res) => {
  try {
    let { email, token } = req.allParams();

    const result = await User.verifyEmail(email, token);

    if (!result.success) {
      return res.error(success.message, success.helper);
    }

    return res.ok('EMAIL_VERIFIED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    let { email, token, newPassword, confirmPassword } = req.allParams();
    let tokenData;

    try {
      tokenData = decrypt(token);
      tokenData = JSON.parse(tokenData);
    } catch (e) {
      return res.error('INVALID_RESET_PASSWORD_TOKEN', 'CANNOT_DECRYPT_TOKEN');
    }

    const user = await User.findOne({ email: tokenData.email, forgotPasswordToken: { $ne: '' }, isDeleted: false });

    if (!user) {
      return res.error('INVALID_RESET_PASSWORD_TOKEN', 'USER_NOT_FOUND');
    }

    if (user._id.toString() !== tokenData.userId) {
      return res.error('INVALID_RESET_PASSWORD_TOKEN', 'USER_ID_NOT_VALID');
    }

    if (user.email !== email) {
      return res.error('INVALID_RESET_PASSWORD_TOKEN', 'EMAIL_NOT_VALID');
    }

    if (tokenData.motive !== 'FORGOT_PASSWORD') {
      return res.error('INVALID_RESET_PASSWORD_TOKEN', 'INCORRECT_MOTIVE');
    }

    if (newPassword !== confirmPassword) {
      return res.error('PASSWORDS_DO_NOT_MATCH');
    }

    await user.setPassword(newPassword);

    return res.ok('PASSWORD_UPDATED');
  } catch (e) {
    return res.internalServerError(e);
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

module.exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.allParams();

    const user = await User.findOne({ email, isDeleted: false });

    if (!user) {
      return res.error('NO_USER_FOUND_FOR_THIS_EMAIL');
    }

    const limitExceeded =
      user.lastverifyEmailSentOn &&
      user.lastverifyEmailSentOn >=
        moment()
          .subtract(30, 'm')
          .toDate()
          .toISOString();

    if (limitExceeded) {
      return res.error('VERIFY_EMAIL_LIMIT_EXCEEDED');
    }

    const token = await user.generateVerifyEmailToken();

    sendMailQueue.add({
      emailModule: 'REGISTRATION',
      to: user.email,
      data: {
        LINK: `${HOST}/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`,
      },
    });

    return res.ok();
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

module.exports.updateAvatar = async (req, res) => {
  try {
    let { user } = req;

    const file = req.files[0];

    if (!file) {
      return res.error('NO_FILE_PRESENT');
    }

    const ext = file.originalname.split('.').pop();

    if (!ext || !['jpg', 'png', 'jpeg'].includes(ext)) {
      return res.error('INVALID_FILE');
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.error('INVALID_FILE');
    }

    if (file.size / 1024 / 1024 > 2) {
      // Should not be greater than 2 MB
      return res.error('FILE_TOO_LARGE');
    }

    const fileName = `avatar-${Date.now()}.${ext}`;
    const avatarFolder = path.join(PROJECT_ROOT, 'resources', user._id.toString(), 'avatar');

    await writeFile(avatarFolder, fileName, file.buffer);

    // update user
    await User.findByIdAndUpdate(user._id, {
      avatar: { src: fileName, mimeType: file.mimetype },
      socialImage: false,
    });

    // get updated user
    user = await User.getProfile(user._id);

    return res.ok({ message: 'PROFILE_UPDATED', data: { user } });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, deviceId, source } = req.allParams();
    const { user } = req;

    // delete other tokens for this deviceId.
    await Device.deleteMany({ deviceId });

    // add new token.
    await Device.create({ deviceId, fcmToken, source, userId: user._id });

    return res.ok('TOKEN_UPDATED');
  } catch (e) {
    return res.internalServerError(e);
  }
};
