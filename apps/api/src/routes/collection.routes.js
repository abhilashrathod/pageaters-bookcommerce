const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/collection.controller');

router.get('/', controller.getAll);
router.post('/', controller.create);

module.exports = router;

