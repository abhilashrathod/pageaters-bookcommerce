const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('../middlewares/validate.middleware');

const controller = require('./../controllers/auth.controller');
const { limiters } = require('../middlewares/rateLimit.middleware');
const { forgotPasswordPayloadSchema, loginPayloadSchema, registerPayloadSchema, resendVerificationEmailPayloadSchema, resetPasswordPayloadSchema, revokeValidationPayloadSchema, sendVerifyContactPayloadSchema, updatePasswordPayloadSchema, updateProfilePayloadSchema, verifyContactPayloadSchema, verifyEmailPayloadSchema } = require('@pageaters/shared');

router.post('/register', limiters.messageSend, validate(registerPayloadSchema), controller.register);
router.post('/login', limiters.login, validate(loginPayloadSchema), controller.login);

router.post('/verify-email', limiters.codeCheck, validate(verifyEmailPayloadSchema), controller.verifyEmail);
router.post('/verify-email/resend', limiters.messageSend, validate(resendVerificationEmailPayloadSchema), controller.resendVerificationEmail);

router.post('/forgot-password', limiters.messageSend, validate(forgotPasswordPayloadSchema), controller.forgotPassword);
router.post('/forgot-password/resend', limiters.messageSend, validate(resendVerificationEmailPayloadSchema), controller.resendForgetPasswordEmail);
router.post('/reset-password', limiters.codeCheck, validate(resetPasswordPayloadSchema), controller.resetPassword);

router.post('/contact/send', limiters.messageSend, validate(sendVerifyContactPayloadSchema), permissionValidator(USER_ROLES.USER), controller.sendContactVerification);
router.post('/contact/resend', limiters.messageSend, permissionValidator(USER_ROLES.USER), controller.resendContactVerification);
router.post('/contact/verify', limiters.codeCheck, validate(verifyContactPayloadSchema), permissionValidator(USER_ROLES.USER), controller.verifyContact);

router.post('/logout', permissionValidator(), validate(revokeValidationPayloadSchema), controller.revokeToken);

router.get('/me', permissionValidator(USER_ROLES.USER), controller.me);
router.put('/me', permissionValidator(), validate(updateProfilePayloadSchema), controller.updateProfile);

router.put('/password', permissionValidator(), validate(updatePasswordPayloadSchema), controller.updatePassword);

module.exports = router;
