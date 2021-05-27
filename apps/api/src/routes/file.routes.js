const { Router } = require('express');
const router = new Router();

const permissionVerification = require('../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/file.controller');

router.post('/upload', permissionVerification(), controller.upload);

module.exports = router;
