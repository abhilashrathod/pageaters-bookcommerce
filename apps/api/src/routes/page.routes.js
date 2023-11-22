const { Router } = require('express');
const router = new Router();

const { USER_ROLES } = require('./../constants/enums');

const controller = require('./../controllers/page.controller');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');

router.get('/', permissionValidator(USER_ROLES.ADMIN), controller.getAll);
router.get('/slug/:slug', controller.getBySlug);

module.exports = router;

