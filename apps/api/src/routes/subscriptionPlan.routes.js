const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/subscriptionPlan.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;

