const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
const Razorpay = require('razorpay');
const colors = require('colors');
const { get } = require('lodash');

const { HOST, PROJECT_ROOT, TWILIO, RAZOR_PAY, ENCRYPTION_KEY } = require('./../appConfig');
const { models, enums } = require('../constants');

const { encrypt, decrypt, generateJwtToken, generateRefreshToken } = require('../helpers/encryption.helper');
const { writeFile, generateRandomNumber } = require('./../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const User = mongoose.model(models.USER);
const AccessTokens = mongoose.model(models.ACCESS_TOKEN);
const Cart = mongoose.model(models.CART);

const twilioClient = require('twilio')(TWILIO.ACCOUNT_SID, TWILIO.AUTH_TOKEN);
const razorPayInstance = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });

const REFRESH_TOKEN_OPTIONS = {
  httpOnly: true,
  expires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
};

const ACCESS_TOKEN_OPTIONS = {
  httpOnly: true,
  expires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
};

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
};

module.exports.register = async (req, res) => {
  try {
    let { email, password } = req.allParams();
    const ipAddress = req.ip;

    const isEmailAvailable = await User.isEmailAvailable(email);

    if (!isEmailAvailable) {
      return res.error('USER_ALREADY_REGISTERED');
    }

    const user = await User.create({ email, role: enums.USER_ROLES.USER });
    // const razorPayCustomer = await razorPayInstance.customers.create({ name: fullName, email, contact: '', notes: {} }); TODO: remove this later

    await user.setPassword(password);
    const verifyToken = await user.generateVerifyEmailToken();

    // user.razorPayCustId = razorPayCustomer.id; TODO: remove this later
    user.verifyEmailToken = verifyToken;
    user.lastVerifyEmailSentOn = new Date().toISOString();

    user.save();

    const newUserCart = await Cart.create({ user: user._id });

    const { payload, token } = generateJwtToken(user, ipAddress);
    // const refreshToken = generateRefreshToken(user, ipAddress);

    await AccessTokens.create(payload);
    // const profile = await User.getProfile(user._id); // TODO: Improvement could be made

    sendMailQueue.add({
      emailModule: 'REGISTRATION',
      to: user.email,
      subject: 'Pageaters Account - Greetings from Pageaters!',
      data: {
        FULL_NAME: returnAddressName('', user.email),
        LINK: `${HOST}/auth/verify?token=${verifyToken}&email=${encodeURIComponent(user.email)}`,
      },
    });

    // create a refresh token cookie that will also expires in 7 days
    // res.cookie(enums.TOKEN_ID.REFRESH_TOKEN_COOKIE, refreshToken.token, REFRESH_TOKEN_OPTIONS);

    // create an access token cookie that will also expires in 7 days
    res.cookie(enums.TOKEN_ID.ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_OPTIONS);

    // Attach cart cookie for shopping cart
    res.cookie(enums.TOKEN_ID.CART_COOKIE, newUserCart._id, CART_COOKIE_OPTIONS);

    return res.ok({ message: 'REGISTRATION_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.allParams();
    const ipAddress = req.ip;

    let user = await User.findOne({ email, status: enums.USER_STATUS.ACTIVE });

    if (!user) {
      return res.error('INVALID_LOGIN_ATTEMPT', 'INVALID_USER');
    }

    if (!user.isPasswordValid(password)) {
      return res.error('INVALID_LOGIN_ATTEMPT', 'INVALID_PASSWORD');
    }

    // update last login to latest
    user.lastLoginAt = new Date();
    user.save();

    // generate necessary token
    const { token, payload } = generateJwtToken(user, ipAddress);
    // const refreshToken = generateRefreshToken(user, ipAddress);
    await AccessTokens.create({ ...payload, token });

    // get user profile
    user = await User.getProfile(user._id);
    const cartRes = await Cart.findOne({ user: user._id });

    // create a refresh token cookie that will also expires in 7 days
    // res.cookie(enums.TOKEN_ID.REFRESH_TOKEN_COOKIE, refreshToken.token, REFRESH_TOKEN_OPTIONS);

    // create an access token cookie that will also expires in 7 days
    res.cookie(enums.TOKEN_ID.ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_OPTIONS);

    // Attach cart cookie for shopping cart
    res.cookie(enums.TOKEN_ID.CART_COOKIE, cartRes._id, CART_COOKIE_OPTIONS);

    if (!user.emailVerified) {
      return res.ok({ message: 'EMAIL_VERIFICATION_PENDING', data: user });
    }

    return res.ok({ message: 'LOGIN_SUCCESS', data: user });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.refreshToken = async (req, res) => {
  try {
    console.info('in progress');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.revokeToken = async (req, res) => {
  try {
    const token = req.cookies[enums.TOKEN_ID.ACCESS_TOKEN_COOKIE];
    const ipAddress = req.ip;
    const userId = get(req, 'user.userId', '');

    if (!token) {
      return res.unauthorized('INVALID_TOKEN');
    }

    // users can revoke their own tokens and admins can revoke any tokens
    const accessToken = await AccessTokens.findOne({ token, userId });
    if (!accessToken) {
      return res.unauthorized('TOKEN_UNMATCHED');
    }

    // revoke token and save
    accessToken.revoked = Date.now();
    accessToken.revokedByIp = ipAddress;
    await accessToken.save();

    // revoke refresh token & cart cookie
    const cookieOptions = {
      httpOnly: true,
      expires: 0,
    };

    // res.cookie(enums.TOKEN_ID.REFRESH_TOKEN_COOKIE, '', cookieOptions);
    res.cookie(enums.TOKEN_ID.ACCESS_TOKEN_COOKIE, '', cookieOptions);
    res.cookie(enums.TOKEN_ID.CART_COOKIE, '', cookieOptions);

    return res.ok({ message: 'TOKEN_REVOKED', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.me = async (req, res) => {
  try {
    let { user } = req;

    user = await User.getProfile(user.userId);

    return res.ok({ message: 'ME_SUCCESS', data: user });
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

module.exports.adminRegister = async (req, res) => {
  try {
    let { email, password, fullName } = req.allParams();
    const ipAddress = req.ip;

    const isEmailAvailable = await User.isEmailAvailable(email);

    if (!isEmailAvailable) {
      return res.error('EMAIL_UNAVAILABLE');
    }

    const user = await User.create({ email, fullName, role: enums.USER_ROLES.ADMIN, emailVerified: true, contactVerified: true });

    await user.setPassword(password);

    const { payload, token } = generateJwtToken(user, ipAddress);

    await AccessTokens.create(payload);

    // create an access token cookie that will also expires in 7 days
    res.cookie(enums.TOKEN_ID.ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_OPTIONS);

    return res.ok({ message: 'REGISTRATION_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { fullName, contactNo } = req.allParams();
    let { user } = req;

    const fieldsToUpdate = {};

    if (fullName) {
      fieldsToUpdate.fullName = fullName;
    }

    if (contactNo) {
      fieldsToUpdate.contactNo = contactNo;
    }

    await User.findOneAndUpdate({_id: user.userId}, {$set: {...fieldsToUpdate}});

    user = await User.getProfile(user.userId);

    return res.ok({ message: 'PROFILE_UPDATED', data: user });
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

    const user = await User.findOne({ email, isDeleted: false });

    if (!user) {
      return res.error('NO_USER_FOUND_FOR_THIS_EMAIL');
    }

    const limitExceeded =
      user.lastForgotPasswordSentOn &&
      user.lastForgotPasswordSentOn >=
      moment()
        .subtract(3, 'm')
        .toDate()
        .toISOString();

    if (limitExceeded) {
      return res.error('FORGOT_PASSWORD_LIMIT_EXCEEDED');
    }

    const token = await user.generateForgotPasswordToken(user);

    sendMailQueue.add({
      emailModule: 'FORGOT_PASSWORD',
      to: user.email,
      subject: 'Pageaters Account - Reset Password Requested',
      data: {
        FULL_NAME: returnAddressName(user.fullName, user.email),
        LINK: `${HOST}/auth/reset?token=${token}&email=${encodeURIComponent(user.email)}`,
      },
    });

    return res.ok('FORGOT_PASSWORD_MAIL_SENT');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.resendForgetPasswordEmail = async (req, res) => {
  try {
    const { email } = req.allParams();

    const user = await User.findOne({ email, isDeleted: false });

    if (!user) {
      return res.error('NO_USER_FOUND_FOR_THIS_EMAIL');
    }

    const currentTime = moment().subtract(1, 'm').toDate().toISOString();

    const limitExceeded = user.lastForgotPasswordSentOn && user.lastForgotPasswordSentOn >= currentTime;

    if (limitExceeded) {
      return res.error('FORGOT_PASSWORD_LIMIT_EXCEEDED');
    }

    user.lastForgotPasswordSentOn = new Date().toISOString();
    await user.save();

    sendMailQueue.add({
      emailModule: 'FORGOT_PASSWORD',
      to: user.email,
      subject: 'Pageaters Account - Reset Password Requested',
      data: {
        FULL_NAME: returnAddressName(user.fullName, user.email),
        LINK: `${HOST}/auth/reset?token=${user.forgotPasswordToken}&email=${encodeURIComponent(user.email)}`,
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
      return res.error(result.message, result.success);
    }

    return res.ok('EMAIL_VERIFIED');
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
        .subtract(1, 'm')
        .toDate()
        .toISOString();

    if (limitExceeded) {
      return res.error('VERIFY_EMAIL_LIMIT_EXCEEDED');
    }

    const token = await user.generateVerifyEmailToken();

    sendMailQueue.add({
      emailModule: 'REGISTRATION',
      to: user.email,
      subject: 'Pageaters Account - Greetings from Pageaters!',
      data: {
        FULL_NAME: returnAddressName('', user.email),
        LINK: `${HOST}/auth/verify?token=${token}&email=${encodeURIComponent(user.email)}`,
      },
    });

    return res.ok();
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.sendContactVerification = async (req, res) => {
  try {
    let { contactNo } = req.allParams();
    const verificationCode = generateRandomNumber(6);

    const userId = get(req, 'user.userId', '');

    const loggedInUser = await User.findOne({ _id: userId });

    if (loggedInUser.contactVerified) {
      return res.error('CONTACT_VERIFICATION_EXIST');
    }

    loggedInUser.lastMessageSentOn = new Date().toISOString();
    loggedInUser.contactOtp = verificationCode;
    loggedInUser.contactNo = contactNo;
    loggedInUser.save();

    let message = {
      body: textMessage(loggedInUser.fullName, loggedInUser.email, verificationCode),
      from: TWILIO.PHONE,
      to: '+919000000000', // TODO: Change to original contact no
    };

    await twilioClient.messages.create(message);

    return res.ok({ message: 'CONTACT_VERIFICATION_INITIATED', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.resendContactVerification = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');

    const user = await User.findOne({ _id: userId });

    if (user.contactVerified) {
      return res.error('CONTACT_VERIFICATION_EXIST');
    }

    if (!user.contactOtp) {
      return res.error('CONTACT_VERIFICATION_NOT_EXIST');
    }

    const limitExceeded =
      user.lastMessageSentOn &&
      user.lastMessageSentOn >=
      moment()
        .subtract(1, 'm')
        .toDate()
        .toISOString();

    if (limitExceeded) {
      return res.error('RESEND_OTP_LIMIT_EXCEEDED');
    }

    user.lastMessageSentOn = new Date().toISOString();
    user.save();

    let message = {
      body: textMessage(user.fullName, user.email, user.contactOtp),
      from: TWILIO.PHONE,
      to: '+919000000000', // TODO: Change to contact no later
    };

    await twilioClient.messages.create(message);

    return res.ok('CONTACT_VERIFICATION_INITIATED');

  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.verifyContact = async (req, res) => {
  try {
    const { otp } = req.allParams();

    const userId = get(req, 'user.userId', '');

    const user = await User.findOne({ _id: userId });

    if (user.contactVerified) {
      return res.error('CONTACT_VERIFICATION_EXIST');
    }

    if (!user.contactOtp) {
      return res.error('CONTACT_VERIFICATION_NOT_EXIST');
    }

    if (user.contactOtp !== otp) {
      return res.error('OTP_VERIFICATION_FAILED');
    }

    if (user.contactOtp === otp && !user.contactVerified) {
      user.contactVerified = true;
      user.lastMessageSentOn = '';
      user.contactOtp = '';
      user.save();
      return res.ok('OTP_VERIFICATION_SUCCESS');
    }

    return res.error('OTP_VERIFICATION_FAILED');
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

/* TEMMO */

module.exports.sms = async (req, res) => {
  try {
    let { fullName, email, contact, notes = {} } = req.allParams();

    // const payload = { name: fullName, email, contact, notes };

    // const razorPayCustomer = await razorPayInstance.customers.create(payload);

    const success = await twilioClient.messages.create(payload);

    // {
    //   "id": "cust_IIHBr2RHTMWmuc",
    //   "entity": "customer",
    //   "name": "Abhilash Rathod",
    //   "email": "owner@example.com",
    //   "contact": "+91-9876543210",
    //   "gstin": null,
    //   "notes": [],
    //   "created_at": 1636192620
    // }
    //
    // sendMailQueue.add({
    //   emailModule: 'REGISTRATION',
    //   to: "support@demo.pageaters.com",
    //   data: {
    //     NAME: `Abhilash Rathore`
    //   },
    // });

    const query = {
      _id: '61993d8f6cd124042837359d',
      'subscription.razorPayPlanId': '',
      'subscription.plan': null,
      'subscription.isActive': false,
      $or: [
        { 'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.AUTHENTICATED },
        { 'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.NEW },
        { 'subscription.currentStatus': enums.SUBSCRIPTION_STATUSES.ACTIVE },
      ],
    };


    const userRes = await User.findOne(query);


    return res.ok({ message: 'ME_SUCCESS', data: userRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

function textMessage(name, email, code) {
  return `Hi ${name ? name : email.split('@')[0]}, Pageaters verification code: ${code}`;
}

function returnAddressName(name, email) {
  return `${name ? name : email.split('@')[0]}`;
}
