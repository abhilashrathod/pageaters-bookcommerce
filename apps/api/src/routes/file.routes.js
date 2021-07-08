const { Router } = require('express');
const router = new Router();
const { models, enums } = require('../constants');

const permissionVerification = require('../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/file.controller');

router.post('/upload', controller.uploadBucket);

module.exports = router;
