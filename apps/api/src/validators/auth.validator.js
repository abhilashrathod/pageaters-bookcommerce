const Joi = require('joi');

const { email, password, fullName, otp, phone} = require('./common.validator');

module.exports.registerPayload = Joi.object({
  email,
  password,
  fullName,
});

module.exports.verifyEmail = Joi.object({
  email,
  token: Joi.string()
    .required()
    .trim()
    .description('Email verification token')
    .error(new Error('INVALID_TOKEN')),
});

module.exports.sendVerifyContact = Joi.object({
  contactNo: phone,
});

module.exports.verifyContact = Joi.object({
  otp,
});

module.exports.login = Joi.object({
  email,
  password,
});

module.exports.updatePassword = Joi.object({
  password,
  newPassword: password,
  confirmPassword: password,
});

module.exports.forgotPassword = Joi.object({
  email,
});

module.exports.resetPassword = Joi.object({
  token: Joi.string()
    .required()
    .trim()
    .description('Reset Password token')
    .error(new Error('INVALID_RESET_PASSWORD_TOKEN')),
  email,
  newPassword: password,
  confirmPassword: password,
});

module.exports.updateProfile = Joi.object({
  fullName,
  contactNo: Joi.string()
    .length(10)
    .regex(/^\d+$/)
    .allow('')
    .trim()
    .description('Contact No')
    .error(new Error('INVALID_PHONE'))
});

module.exports.resendVerificationEmail = Joi.object({
  email,
});

module.exports.revokeValidation = Joi.object({
  token: Joi.string().empty('')
});

module.exports.deleteAccount = Joi.object({
  password: Joi.string()
    .required()
    .error(new Error('INVALID_PASSWORD')),
});
