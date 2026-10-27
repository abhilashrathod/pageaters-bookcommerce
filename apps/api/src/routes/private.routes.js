const { Router } = require('express');

const router = new Router();

const permissionVerification = require('./../middlewares/permissionVerification.middleware');

const controller = require('./../controllers/private.controller');

const PRIVATE_KEY = '***REMOVED***';

function privateRouteValidator(req, res, next) {
  const privateKey = req.get('x-privateKey') || '';

  if (privateKey !== PRIVATE_KEY) {
    return res.forbidden();
  }

  next();
}

router.get('/queueStats', privateRouteValidator, controller.getQueueStats);
router.post('/hardDelete', permissionVerification(), privateRouteValidator, controller.hardDeleteUser);
router.post('/sendMail', privateRouteValidator, controller.sendMail);

module.exports = router;
