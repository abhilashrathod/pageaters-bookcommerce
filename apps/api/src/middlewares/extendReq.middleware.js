const _ = require('lodash');
const mongoose = require('mongoose');

const { ENVIRONMENT } = require('./../appConfig');
const { models } = require('./../constants');

const ApiLogs = mongoose.model(models.LOG_API);

async function logRequest(req, message = '', resPayload = '') {
  const { headers, hostname, ip, method, originalUrl, user, token } = req;

  console.log(
    JSON.stringify(
      {
        message,
        headers: req.headers,
        params: req.allParams(),
        hostname: req.hostname,
        ip: req.ip,
        method: req.method,
        originalUrl: req.originalUrl,
        user: req.user,
        token,
        resPayload,
      },
      null,
      2,
    ),
  );

  await ApiLogs.findOneAndUpdate(
    { hostname, ip, method, originalUrl, message },
    { hostname, ip, method, originalUrl, headers, user, params: req.allParams(), message },
    { upsert: true },
  );
}

module.exports = (req, res, next) => {
  req.allParams = () => _.merge(req.params, req.query, req.body);

  res.set('x-application-identifier', `boilerplate-${ENVIRONMENT}`);

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
    logRequest(req, debugMessage, resPayload);

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

  res.internalServerError = e => {
    console.log(e);
    logRequest(req, e);

    return res.status(500).send({
      statusCode: 500,
      status: 'SOME_ERROR_OCCURRED',
      message: res.__('SOME_ERROR_OCCURRED'),
      error: res.__('SOME_ERROR_OCCURRED'),
      data: {},
    });
  };

  res.unauthorized = (message = '') => {
    console.log(message);
    logRequest(req);

    return res.status(401).send({
      statusCode: 401,
      status: 'UNAUTHORIZED',
      message: res.__('UNAUTHORIZED'),
      data: {},
      error: res.__('UNAUTHORIZED'),
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
