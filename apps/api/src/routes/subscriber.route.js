const { Router } = require('express');
const router = new Router();

const requestValidator = require('../middlewares/requestValidator.middleware');

const controller = require('./../controllers/subscriber.controller');
const validator = require('./../validators/subscriber.validator');

router.post('/', requestValidator(validator.rootPayload), controller.create);
router.get('/', requestValidator(validator.pagination), controller.getAll);

module.exports = router;
