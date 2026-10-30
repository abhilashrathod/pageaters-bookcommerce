const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/favorites.controller');
const { favoritesRequestPayloadSchema } = require('@pageaters/shared');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('../middlewares/validate.middleware');

router.get('/', permissionValidator(USER_ROLES.USER), controller.getAll);
router.get('/:product', validate(favoritesRequestPayloadSchema), permissionValidator(USER_ROLES.USER), controller.checkPresent);
router.post('/', validate(favoritesRequestPayloadSchema), permissionValidator(USER_ROLES.USER), controller.add);
router.delete('/:product', validate(favoritesRequestPayloadSchema), permissionValidator(USER_ROLES.USER), controller.remove);

module.exports = router;
