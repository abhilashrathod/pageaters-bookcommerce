const { demo } = require('../constants');
const { env } = require('../env');
const { AppError } = require('../helpers/appError.helper');
const { safeEqual } = require('../helpers/encryption.helper');

// DEMO_MODE (src/env.js) route switches: `demoOnly` hides a route outside demo mode (the same 404 as an unknown
// route); `offInDemo` turns a route off in demo mode with a message that says why; `demoAdminReadOnly` (after the
// ADMIN check, which sets `req.user`) refuses the demo admin's catalog writes, uploads and store-credit issuing. Order
// lifecycle actions stay open to it; the super-admin and any other admin are never refused. `cronSecret` admits only
// `Authorization: Bearer <CRON_SECRET>` (the weekly cleanup; DEMO_MODE requires the secret, src/env.js).

const demoOnly = (req, res, next) => next(env.DEMO_MODE ? undefined : new AppError('NOT_FOUND', { status: 404 }));

const offInDemo = (req, res, next) => next(env.DEMO_MODE ? new AppError('OFF_IN_DEMO_MODE') : undefined);

const demoAdminReadOnly = (req, res, next) =>
  next(env.DEMO_MODE && req.user?.email === demo.DEMO_ADMIN_EMAIL ? new AppError('DEMO_ADMIN_READ_ONLY') : undefined);

const cronSecret = (req, res, next) => {
  const presented = req.get('authorization') ?? '';
  const valid = env.CRON_SECRET !== undefined && safeEqual(presented, `Bearer ${env.CRON_SECRET}`);
  next(valid ? undefined : new AppError('INVALID_TOKEN', { status: 401 }));
};

module.exports = { cronSecret, demoAdminReadOnly, demoOnly, offInDemo };
