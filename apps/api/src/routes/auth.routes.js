const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/auth.controller');
const validator = require('./../validators/auth.validator');

router.post('/register', requestValidator(validator.registerPayload), controller.register);
router.post('/login', requestValidator(validator.login), controller.login);

router.post('/verify-email', requestValidator(validator.verifyEmail), controller.verifyEmail);
router.post('/verify-email/resend', requestValidator(validator.resendVerificationEmail), controller.resendVerificationEmail);

router.post('/forgot-password', requestValidator(validator.forgotPassword), controller.forgotPassword);
router.post('/forgot-password/resend', requestValidator(validator.resendVerificationEmail), controller.resendForgetPasswordEmail);
router.post('/reset-password', requestValidator(validator.resetPassword), controller.resetPassword);

router.post('/contact/send', requestValidator(validator.sendVerifyContact), permissionValidator(USER_ROLES.USER), controller.sendContactVerification);
router.post('/contact/resend', permissionValidator(USER_ROLES.USER), controller.resendContactVerification);
router.post('/contact/verify', requestValidator(validator.verifyContact), permissionValidator(USER_ROLES.USER), controller.verifyContact);

router.post('/logout', permissionValidator(), requestValidator(validator.revokeValidation), controller.revokeToken);

router.get('/me', permissionValidator(USER_ROLES.USER), controller.me);
router.put('/me', permissionValidator(), requestValidator(validator.updateProfile), controller.updateProfile);
router.delete('/me', permissionValidator(), requestValidator(validator.deleteAccount), controller.deleteAccount);

router.put('/password', permissionValidator(), requestValidator(validator.updatePassword), controller.updatePassword);

router.get('/recoverAccount', permissionValidator(), controller.recoverAccount);

module.exports = router;
