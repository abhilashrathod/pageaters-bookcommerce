const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4 } = require('uuid');

const algorithm = 'aes-256-cbc';
const { ENCRYPTION_KEY } = require('./../appConfig');
const { models } = require('../constants');

const RefreshToken = mongoose.model(models.REFRESH_TOKEN);

module.exports.generateJwtToken = (account) => {
  // create a jwt token containing the account id that expires in 15 minutes
  const dataToEncrypt = {
    userId: account.id,
    createdAt: Date.now(),
    role: account.role,
    motive: 'AUTH',
    email: account.email,
  };
  return jwt.sign(dataToEncrypt, ENCRYPTION_KEY, { expiresIn: '15m' });
};

module.exports.generateRefreshToken = async (account, ipAddress) => {
  // create a refresh token that expires in 7 days
  const token = {
    account: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
    createdByIp: ipAddress,
  };
  return RefreshToken.create(token);
};

async function getAccount(id) {
  if (!db.isValidId(id)) throw 'Account not found';
  const account = await db.Account.findById(id);
  if (!account) throw 'Account not found';
  return account;
}

async function getRefreshToken(token) {
  const refreshToken = await RefreshToken.findOne({ token }).populate('account');
  if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
  return refreshToken;
}


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
