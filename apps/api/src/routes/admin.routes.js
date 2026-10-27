const { Router } = require('express');
const router = new Router();


const controller = require('./../controllers/auth.controller');

router.post('/banavo', controller.adminRegister);

module.exports = router;
