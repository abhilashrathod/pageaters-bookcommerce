const crypto = require('crypto');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports.writeFile = async (folder, fileName, buffer) => {
  return new Promise(async (resolve, reject) => {
    try {
      await fs.promises.mkdir(folder, { recursive: true });

      fs.writeFile(path.join(folder, fileName), buffer, async () => {
        return resolve();
      });
    } catch (e) {
      return reject(e);
    }
  });
};

module.exports.generateRandomString = (length = 12) => {
  // Alphanumeric base64 characters (same output as the former random-base64-string package).
  let string = '';
  while (string.length < length) {
    string += crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '');
  }
  return string.slice(0, length);
};

module.exports.generateRandomNumber = (n) => {
  return Math.floor(Math.random() * (9 * Math.pow(10, n - 1))) + Math.pow(10, n - 1);
};

module.exports.getId = (id) => {
  if (id) {
    if (id.length !== 24) {
      return id;
    }
  }
  return new mongoose.Types.ObjectId(id);
};

module.exports.arrayDifference = (a1, a2) => {
  let a = [], diff = [];
  for (let i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }
  for (let i = 0; i < a2.length; i++) {
    if (a[a2[i]]) {
      delete a[a2[i]];
    } else {
      a[a2[i]] = true;
    }
  }
  for (let k in a) {
    diff.push(k);
  }
  return diff;
};
