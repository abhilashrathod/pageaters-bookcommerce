const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const validate = require('../middlewares/validate.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/subscriber.controller');
const { subscriberRootPayloadSchema } = require('@pageaters/shared');

router.post('/', validate(subscriberRootPayloadSchema), controller.create);

// ADMIN
router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);

module.exports = router;
