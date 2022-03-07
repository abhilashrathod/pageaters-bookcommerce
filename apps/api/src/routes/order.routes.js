const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/order.controller');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.get('/getById/:id', permissionValidator(USER_ROLES.USER), controller.getById);
router.get('/getByUniqueId/:uniqueId', permissionValidator(USER_ROLES.USER), controller.getByUniqueId);
router.get('/list', permissionValidator(USER_ROLES.USER), controller.getAllByUser);

router.post('/create', permissionValidator(USER_ROLES.USER), controller.create);
router.post('/attempt', permissionValidator(USER_ROLES.USER), controller.attempt);
router.get('/retrieve', permissionValidator(USER_ROLES.USER), controller.retrieve);
router.post('/confirm', controller.verifyAndConfirm);

// router.patch('/:id', permissionValidator(USER_ROLES.USER), controller.update);
// router.delete('/:id', permissionValidator(USER_ROLES.USER), controller.destroy);

// router.get('/check-pincode/:pincode', controller.checkServiceability);


module.exports = router;

