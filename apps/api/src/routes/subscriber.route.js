const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const requestValidator = require('../middlewares/requestValidator.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/subscriber.controller');
const validator = require('./../validators/subscriber.validator');

router.post('/', requestValidator(validator.rootPayload), controller.create);
router.get('/', controller.getAll);

module.exports = router;
