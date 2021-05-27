const mongoose = require('mongoose');

const { models } = require('./../constants');

const PerfApi = mongoose.model(models.PERF_API);

module.exports = (req, res, next) => {
  function afterResponse() {
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${Date.now() - req.start} ms`);
    PerfApi.create({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      milliSecondsTaken: Date.now() - req.start,
    });

    res.removeListener('finish', afterResponse);
    res.removeListener('close', afterResponse);

    // action after response
  }

  res.on('finish', afterResponse);
  res.on('close', afterResponse);

  req.start = Date.now();

  next();
};
