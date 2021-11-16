const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/auth.controller');
const validator = require('./../validators/auth.validator');

router.post('/register', requestValidator(validator.registerPayload), controller.register);
router.get('/verify-email', requestValidator(validator.verifyEmail), controller.verifyEmail);
router.post('/login', requestValidator(validator.login), controller.login);
router.post('/refresh-token', controller.refreshToken);
router.post('/logout', permissionValidator(), requestValidator(validator.revokeValidation), controller.revokeToken);
router.get('/me', permissionValidator(USER_ROLES.USER), controller.me);
router.put('/me', permissionValidator(), requestValidator(validator.updateProfile), controller.updateProfile);
router.delete('/me', permissionValidator(), requestValidator(validator.deleteAccount), controller.deleteAccount);
router.put('/password', permissionValidator(), requestValidator(validator.updatePassword), controller.updatePassword);
router.post('/forgot-password', requestValidator(validator.forgotPassword), controller.forgotPassword);
router.post('/reset-password', requestValidator(validator.resetPassword), controller.resetPassword);
// router.get('/logout', permissionValidator(), requestValidator(validator.revokeValidation), controller.logout);
router.post('/resend-verify-email', requestValidator(validator.resendVerificationEmail), controller.resendVerificationEmail);
router.get('/recoverAccount', permissionValidator(), controller.recoverAccount);
router.put('/avatar', permissionValidator(), controller.updateAvatar);
router.put('/fcmtoken', permissionValidator(), requestValidator(validator.updateFcmToken), controller.updateFcmToken);
router.post('/sms', controller.sms);

/* SUBSCRIPTION */



module.exports = router;
