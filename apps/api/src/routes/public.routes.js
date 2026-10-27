const { Router } = require('express');
const router = new Router();


const controller = require('./../controllers/public.controller');

router.post('/contactUs', controller.contactUs);

module.exports = router;
