const _ = require('lodash');

const { ENVIRONMENT } = require('./../appConfig');

// The legacy response helpers (res.ok, res.error…) and req.allParams(). Nothing here logs the request: the access
// line comes from requestContext.middleware.js, and an unexpected error is logged by res.internalServerError as its
// summary only (the logger's `err` serializer, helpers/logger.helper.js errorSummary), never its message, params or
// headers.

module.exports = (req, res, next) => {
  req.allParams = () => _.merge(req.params, req.query, req.body);

  res.set('x-application-identifier', `PAGEATERS-${ENVIRONMENT}`);

  res.ok = (resPayload = {}) => {
    if (typeof resPayload === 'string') {
      return res.send({
        statusCode: 200,
        status: resPayload,
        data: {},
        message: res.__(resPayload),
      });
    }

    const { message = 'SUCCESS', data = {} } = resPayload;
    return res.status(200).send({
      statusCode: 200,
      status: message,
      message: res.__(message),
      data,
    });
  };

  res.created = ({ data, message }) => {
    return res.status(201).send({
      statusCode: 201,
      data: data,
      message: res.__(message),
    });
  };

  res.error = (resPayload, debugMessage) => {
    // Why the request was refused when the code alone doesn't say (e.g. INVALID_PASSWORD behind INVALID_LOGIN_ATTEMPT).
    if (debugMessage) req.log.debug({ debugMessage }, 'request refused');

    if (typeof resPayload === 'string') {
      return res.status(400).send({
        statusCode: 400,
        status: resPayload,
        error: res.__(resPayload),
        message: res.__(resPayload),
        data: {},
      });
    }

    const { statusCode = 400, message = 'BAD_REQUEST', data = {} } = resPayload;

    return res.status(statusCode).send({
      statusCode,
      status: message,
      message: res.__(message),
      error: res.__(message),
      data,
    });
  };

  res.internalServerError = (e) => {
    req.log.error({ err: e }, 'request failed');

    return res.status(500).send({
      statusCode: 500,
      status: 'SOME_ERROR_OCCURRED',
      message: res.__('SOME_ERROR_OCCURRED'),
      error: res.__('SOME_ERROR_OCCURRED'),
      data: {},
    });
  };

  res.unauthorized = (message = '') => {
    return res.status(401).send({
      statusCode: 401,
      status: 'UNAUTHORIZED',
      message: res.__(message || 'UNAUTHORIZED'),
      data: {},
      error: res.__(message || 'UNAUTHORIZED'),
    });
  };

  res.forbidden = () => {
    return res.status(403).send({
      statusCode: 403,
      status: 'FORBIDDEN',
      message: res.__('FORBIDDEN'),
      data: {},
      error: res.__('FORBIDDEN'),
    });
  };

  next();
};
