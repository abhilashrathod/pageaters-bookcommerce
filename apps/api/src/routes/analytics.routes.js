const { Router } = require('express');
const { z } = require('zod');
const { objectIdSchema } = require('@pageaters/shared');

const { USER_ROLES } = require('./../constants/enums');
const permissionValidator = require('./../middlewares/permissionVerification.middleware');
const validate = require('./../middlewares/validate.middleware');
const controller = require('./../controllers/analytics.controller');

const router = new Router();

// The id goes into an aggregation's $match (not sanitised like a query filter), so it is validated first.
const idParams = z.object({ id: objectIdSchema });
const admin = permissionValidator(USER_ROLES.ADMIN);

router.get('/summary', admin, controller.summary);
router.get('/books/:id', admin, validate(idParams), controller.book);
router.get('/customers/:id', admin, validate(idParams), controller.customer);

module.exports = router;
