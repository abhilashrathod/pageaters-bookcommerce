const randomString = require('random-base64-string');
const mkdirp = require('mkdirp');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const appConfig = require('./../appConfig');

module.exports.writeFile = async (folder, fileName, buffer) => {
  return new Promise(async (resolve, reject) => {
    try {
      await mkdirp(folder, { recursive: true });

      fs.writeFile(path.join(folder, fileName), buffer, async () => {
        return resolve();
      });
    } catch (e) {
      return reject(e);
    }
  });
};

module.exports.moveFile = async (oldPath, newFolderPath, newPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      await mkdirp(newFolderPath, { recursive: true });

      fs.renameSync(oldPath, newPath);

      return resolve();
    } catch (e) {
      return reject(e);
    }
  });
};

module.exports.checkEnvVariables = async () => {
  try {
    for (const variable of Object.keys(appConfig)) {
      if (appConfig[variable] === undefined || appConfig[variable] === null || appConfig[variable] === '') {
        console.log(`Missing Config variable: ${variable}`);
      }
    }
  } catch (e) {
    console.log(e);
  }
};

module.exports.generateRandomString = (length = 12) => {
  return randomString(length);
};

module.exports.generateRandomNumber = () => {
  return Math.floor(Math.random() * 9000000000) + 1000000000;
};

module.exports.getId = (id) => {
  if (id) {
    if (id.length !== 24) {
      return id;
    }
  }
  return mongoose.Types.ObjectId(id);
};
