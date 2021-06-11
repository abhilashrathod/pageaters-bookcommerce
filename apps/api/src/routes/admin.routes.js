const { Router } = require('express');
const router = new Router();

const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/auth.controller');
const validator = require('./../validators/auth.validator');

router.post('/register', controller.register);

module.exports = router;
