const jwt = require('jsonwebtoken');

const { ENCRYPTION_KEY } = require('./../appConfig');

module.exports = (req, res, next) => {
  let authHeader = req.get('authorization');
  let token = '';

  if (authHeader) {
    let parts = authHeader.split(' ');
    if (parts.length === 2) {
      let scheme = parts[0];
      let credentials = parts[1];
      // INVALID_TOKEN
      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
      }
    }

    try {
      req.user = jwt.verify(token, ENCRYPTION_KEY);
    } catch (err) {
      // do nothing
    }
  }

  next();
};
