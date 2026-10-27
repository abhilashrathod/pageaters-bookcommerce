const { Router } = require('express');
const router = new Router();

const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/public.controller');
const validator = require('./../validators/public.validator');

router.post('/contactUs', controller.contactUs);

module.exports = router;
