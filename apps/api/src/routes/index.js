const { Router } = require('express');
const router = new Router();

const { client } = require('../middlewares/apiClientValidator.middleware');
const requestValidator = require('./../middlewares/requestValidator.middleware');
const authValidator = require('./../validators/auth.validator');
const authController = require('./../controllers/auth.controller');

router.get('/', async (req, res) => {
  return res.send({
    name: 'API',
    status: 'IT_WORKS',
    message: 'Yes, this is the correct basePath!',
  });
});

router.use('/auth', client, require('./auth.routes'));
router.get('/verify-email', requestValidator(authValidator.verifyEmail), authController.verifyEmail);
router.use('/public', client, require('./public.routes'));
router.use('/private', require('./private.routes'));
router.use('/file', client, require('./file.routes'));

module.exports = router;
