const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/cart.controller');
const validator = require('./../validators/cart.validator');

const cartValidator = require('../middlewares/cartValidator.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.get('/retrieve', permissionValidator(), controller.retrieve);
router.post('/add', requestValidator(validator.cartItemAddPayload), permissionValidator(), cartValidator(), controller.add);
router.put('/update/:id', permissionValidator(), controller.update);
router.delete('/remove/:id', permissionValidator(), controller.remove);
router.delete('/empty', permissionValidator(), controller.empty); // clears all products from cart
router.delete('/clear', permissionValidator(), controller.clear); // clears cookie

router.post('/add/bundle', permissionValidator(), controller.addBundle);
router.delete('/remove/bundle/:bundleId', permissionValidator(), controller.removeBundle);

/*ADMIN*/
// TODO: Add middleware
router.get('/', controller.getAll);

module.exports = router;
