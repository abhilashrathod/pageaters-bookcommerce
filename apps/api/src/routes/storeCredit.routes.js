const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/storeCredit.controller');

// for Users
router.get('/', permissionValidator(USER_ROLES.USER), controller.getStoreCredit);
router.get('/history', permissionValidator(USER_ROLES.USER), controller.getCreditHistory);

router.post('/', permissionValidator(USER_ROLES.ADMIN), controller.issueCredit);


module.exports = router;

