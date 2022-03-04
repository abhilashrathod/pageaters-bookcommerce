const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4 } = require('uuid');

const algorithm = 'aes-256-cbc';
const { ENCRYPTION_KEY } = require('./../appConfig');
const { models } = require('../constants');

module.exports.generateJwtToken = (account, ipAddress) => {
  // create a jwt token containing the info that expires in 7 days
  const data = {
    userId: account.id,
    role: account.role,
    email: account.email,
    createdAt: Date.now(),
    motive: 'AUTH',
    createdByIp: ipAddress,
  };
  return {
    token: jwt.sign(data, ENCRYPTION_KEY, { expiresIn: '7d' }),
    payload: data,
  }
};

module.exports.generateRefreshToken = (account, ipAddress) => {
  // create a refresh token that expires in 7 days
  return {
    account: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
    createdByIp: ipAddress,
  };
};

function randomTokenString() {
  return crypto.randomBytes(40).toString('hex');
}


// ===================================================


module.exports.generateRandomString = length => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

module.exports.hashString = (value, salt) => {
  const hash = crypto.createHmac('sha512', salt);
  hash.update(value);
  const hashString = hash.digest('hex');

  return hashString;
};

module.exports.secureRandom = (length = 32) => `${crypto.randomBytes(length).toString('hex')}-${process.pid}-${v4()}`;

module.exports.randomHex = (length = 32) => crypto.randomBytes(length).toString('hex');


module.exports.encrypt = text => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

module.exports.decrypt = text => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};
