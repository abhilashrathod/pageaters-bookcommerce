const { Router } = require('express');
const router = new Router();
const { enums } = require('../constants');

const permissionVerification = require('../middlewares/permissionVerification.middleware');
const { singleImageUpload } = require('../middlewares/upload.middleware');

const controller = require('./../controllers/file.controller');

// The guard runs before the multipart parser, so nobody without an ADMIN session can make the API buffer a file.
router.post('/upload', permissionVerification(enums.USER_ROLES.ADMIN), singleImageUpload, controller.uploadBucket);

module.exports = router;
