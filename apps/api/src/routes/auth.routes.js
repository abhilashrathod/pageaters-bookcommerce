const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('../middlewares/validate.middleware');

const controller = require('./../controllers/auth.controller');
const { deleteAccountPayloadSchema, forgotPasswordPayloadSchema, loginPayloadSchema, registerPayloadSchema, resendVerificationEmailPayloadSchema, resetPasswordPayloadSchema, revokeValidationPayloadSchema, sendVerifyContactPayloadSchema, updatePasswordPayloadSchema, updateProfilePayloadSchema, verifyContactPayloadSchema, verifyEmailPayloadSchema } = require('@pageaters/shared');

router.post('/register', validate(registerPayloadSchema), controller.register);
router.post('/login', validate(loginPayloadSchema), controller.login);

router.post('/verify-email', validate(verifyEmailPayloadSchema), controller.verifyEmail);
router.post('/verify-email/resend', validate(resendVerificationEmailPayloadSchema), controller.resendVerificationEmail);

router.post('/forgot-password', validate(forgotPasswordPayloadSchema), controller.forgotPassword);
router.post('/forgot-password/resend', validate(resendVerificationEmailPayloadSchema), controller.resendForgetPasswordEmail);
router.post('/reset-password', validate(resetPasswordPayloadSchema), controller.resetPassword);

router.post('/contact/send', validate(sendVerifyContactPayloadSchema), permissionValidator(USER_ROLES.USER), controller.sendContactVerification);
router.post('/contact/resend', permissionValidator(USER_ROLES.USER), controller.resendContactVerification);
router.post('/contact/verify', validate(verifyContactPayloadSchema), permissionValidator(USER_ROLES.USER), controller.verifyContact);

router.post('/logout', permissionValidator(), validate(revokeValidationPayloadSchema), controller.revokeToken);

router.get('/me', permissionValidator(USER_ROLES.USER), controller.me);
router.put('/me', permissionValidator(), validate(updateProfilePayloadSchema), controller.updateProfile);
router.delete('/me', permissionValidator(), validate(deleteAccountPayloadSchema), controller.deleteAccount);

router.put('/password', permissionValidator(), validate(updatePasswordPayloadSchema), controller.updatePassword);

router.get('/recoverAccount', permissionValidator(), controller.recoverAccount);

module.exports = router;
