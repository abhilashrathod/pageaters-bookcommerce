const { Router } = require('express');
const router = new Router();
const jwt = require('express-jwt');
const { ENCRYPTION_KEY } = require('./../appConfig');

const controller = require('./../controllers/cart.controller');
const userFinder = require('./../middlewares/sessionUser.middleware');

router.post('/create', userFinder, controller.create);
router.get('/retrieve', userFinder, controller.retrieve);
router.delete('/empty', userFinder, controller.clear);
router.post('/update', userFinder, controller.update);
router.post('/remove', userFinder, controller.remove);
router.post('/add', userFinder, controller.add);

module.exports = router;
