const { Router } = require('express');
const router = new Router();

// const { client } = require('../middlewares/apiClientValidator.middleware');
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

router.use('/auth', require('./auth.routes'));
router.use('/public', require('./public.routes'));
router.use('/private', require('./private.routes'));
router.use('/file', require('./file.routes'));
router.use('/books', require('./book.routes'));
router.use('/bundles', require('./bundle.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/users', require('./users.routes'));
router.use('/store-books', require('./storeBooks.routes'));
router.use('/authors', require('./author.routes'));
router.use('/categories', require('./category.routes'));
router.use('/collections', require('./collection.routes'));
router.use('/subscribers', require('./subscriber.route'));

module.exports = router;
