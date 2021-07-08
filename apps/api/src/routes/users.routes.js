const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/user.controller');

router.get('/', controller.getAll);
router.put('/:id', controller.update);

module.exports = router;
