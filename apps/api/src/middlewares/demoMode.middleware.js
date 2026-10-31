const { env } = require('../env');
const { AppError } = require('../helpers/appError.helper');

// DEMO_MODE (src/env.js) route switches: `demoOnly` hides a route outside demo mode (the same 404 as an unknown
// route); `offInDemo` turns a route off in demo mode with a message that says why.

const demoOnly = (req, res, next) => next(env.DEMO_MODE ? undefined : new AppError('NOT_FOUND', { status: 404 }));

const offInDemo = (req, res, next) => next(env.DEMO_MODE ? new AppError('OFF_IN_DEMO_MODE') : undefined);

module.exports = { demoOnly, offInDemo };
