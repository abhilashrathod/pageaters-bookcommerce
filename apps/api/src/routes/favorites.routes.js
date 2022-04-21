const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/favorites.controller');
const validator = require('../validators/favorites.validator');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('./../middlewares/requestValidator.middleware');

router.get('/', permissionValidator(USER_ROLES.USER), controller.getAll);
router.get('/:product', requestValidator(validator.requestPayload), permissionValidator(), controller.checkPresent);
router.post('/', requestValidator(validator.requestPayload), permissionValidator(), controller.add);
router.delete('/:product', requestValidator(validator.requestPayload), permissionValidator(), controller.remove);

module.exports = router;
