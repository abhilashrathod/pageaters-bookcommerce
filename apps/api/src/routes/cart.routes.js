const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/cart.controller');
const userFinder = require('./../middlewares/sessionUser.middleware');

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

router.post('/add', permissionValidator(), controller.add);
router.get('/retrieve', permissionValidator(), controller.retrieve);
router.put('/update/:id', permissionValidator(), controller.update);
router.delete('/remove/:id', permissionValidator(), controller.remove);
router.delete('/empty', permissionValidator(), controller.empty); // clears all products from cart
router.delete('/clear', permissionValidator(), controller.clear); // clears cookie

/*ADMIN*/
// TODO: Add middleware
router.get('/', controller.getAll);

module.exports = router;
