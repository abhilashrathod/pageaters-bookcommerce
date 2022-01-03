const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/wishlist.controller');
const validator = require('../validators/wishlist.validator.js');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('./../middlewares/requestValidator.middleware');

router.get('/', permissionValidator(), controller.getAll);
router.get('/:product', requestValidator(validator.requestPayload), permissionValidator(), controller.checkPresent);
router.post('/', requestValidator(validator.requestPayload), permissionValidator(), controller.add);
router.delete('/:product', requestValidator(validator.requestPayload), permissionValidator(), controller.remove);

module.exports = router;
