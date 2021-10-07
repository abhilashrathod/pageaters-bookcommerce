const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/cart.controller');
const userFinder = require('./../middlewares/sessionUser.middleware');

router.post('/add', userFinder, controller.add);
router.get('/retrieve', userFinder, controller.retrieve);
router.put('/update/:id', userFinder, controller.update);
router.delete('/remove/:id', userFinder, controller.remove);
router.delete('/empty', userFinder, controller.empty); // clears all products from cart
router.delete('/clear', userFinder, controller.clear); // clears cookie

module.exports = router;
