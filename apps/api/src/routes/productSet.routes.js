const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/productSets.controller');

/* FOR ADMIN */

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/unique/:id', controller.getByUniqueId);

router.post('/', controller.create);

router.put('/:id', controller.update);

router.delete('/:id', controller.destroy);

/* FOR STORE */

module.exports = router;

