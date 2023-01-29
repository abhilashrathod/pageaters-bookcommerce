const { Router } = require('express');
const router = new Router();

router.get('/', async (req, res) => {
  return res.send({
    name: 'API',
    status: 'IT_WORKS',
    message: 'Yes, this is the correct basePath!',
  });
});

router.use('/admin', require('./admin.routes'));

router.use('/public', require('./public.routes'));
// router.use('/private', require('./private.routes'));
// router.use('/books', require('./book.routes'));
// router.use('/subscription-plan', require('./subscriptionPlan.routes'));
// router.use('/subscription', require('./subscription.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/file', require('./file.routes'));
router.use('/bundles', require('./bundle.routes'));
router.use('/users', require('./users.routes'));
router.use('/store-books', require('./storeBooks.routes'));
router.use('/mystery-boxes', require('./mysteryBox.routes'));
router.use('/authors', require('./author.routes'));
router.use('/categories', require('./category.routes'));
router.use('/collections', require('./collection.routes'));
router.use('/subscribers', require('./subscriber.route'));
router.use('/cart', require('./cart.routes'));
router.use('/favorites', require('./favorites.routes'));
router.use('/stock-alerts', require('./stockAlert.routes'));
router.use('/addresses', require('./address.routes'));
router.use('/orders', require('./order.routes'));
router.use('/deals', require('./storeDeal.routes'));
router.use('/product-sets', require('./productSet.routes'));

module.exports = router;
