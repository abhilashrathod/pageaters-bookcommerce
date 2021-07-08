const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/storeBook.controller');

router.get('/', controller.getAll);
router.get('/search/:q', controller.search);

router.post('/', controller.create);

module.exports = router;

