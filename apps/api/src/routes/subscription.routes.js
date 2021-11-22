const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/subscription.controller');
const validator = require('./../validators/subscription.validator');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.post('/create', requestValidator(validator.createPayload), permissionValidator(USER_ROLES.USER), controller.create);
router.post('/verify', controller.verify);
router.post('/activate', controller.activate);

module.exports = router;

