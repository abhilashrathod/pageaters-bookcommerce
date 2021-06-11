const { Router } = require('express');
const router = new Router();

const controller = require('./../controllers/book.controller');

router.get('/', controller.getAll);

module.exports = router;

