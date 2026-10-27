const { Router } = require('express');
const router = new Router();
const { enums } = require('../constants');

const permissionVerification = require('../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/file.controller');

router.post('/upload', permissionVerification(enums.USER_ROLES.ADMIN), controller.uploadBucket);

module.exports = router;
