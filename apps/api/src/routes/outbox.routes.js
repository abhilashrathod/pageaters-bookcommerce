const { Router } = require('express');
const router = new Router();

const { demoOnly } = require('../middlewares/demoMode.middleware');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/outbox.controller');

router.get('/', demoOnly, permissionValidator(), controller.list);

module.exports = router;
