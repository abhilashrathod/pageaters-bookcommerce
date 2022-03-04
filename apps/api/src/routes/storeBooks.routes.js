const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/storeBook.controller');

router.get('/', controller.getAll);
router.get('/get/:id', controller.getById);
router.get('/unique/:id', controller.getByUniqueId);
router.get('/search', controller.search);

router.post('/', controller.create);

router.put('/:id', controller.update);

router.delete('/:id', controller.destroy);

module.exports = router;

