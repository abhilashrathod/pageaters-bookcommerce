const { Router } = require('express');
const router = new Router();

const { cronSecret, demoOnly } = require('../middlewares/demoMode.middleware');

const controller = require('./../controllers/demo.controller');

// Vercel Cron calls it weekly with GET and `Authorization: Bearer <CRON_SECRET>`.
router.get('/cleanup', demoOnly, cronSecret, controller.cleanup);

module.exports = router;
