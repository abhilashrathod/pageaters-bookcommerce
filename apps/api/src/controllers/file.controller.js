const mongoose = require('mongoose');
const S3 = require('aws-sdk/clients/s3');

const { kebabCase } = require('lodash');

const { AWS } = require('./../appConfig');
const { models, enums } = require('./../constants');
const { generateRandomString } = require('./../helpers/utils.helper');

const File = mongoose.model(models.FILE);

const awsStoreBooksInstance = new S3({
  region: AWS.BUCKET_REGION,
  accessKeyId: AWS.BUCKET_ACCESS_KEY,
  secretAccessKey: AWS.BUCKET_SECRET_KEY,
});

module.exports.upload = async (req, res) => {
  try {
    return res.ok('SUCCESS');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.uploadBucket = async (req, res) => {
  try {
    let { fileModule = '', title } = req.allParams();

    let slug = kebabCase(title);
    let bucketName = getBucketName(fileModule);

    const file = req.files[0];

    if (!file) {
      return res.error('NO_FILE_PRESENT');
    }

    const ext = file.originalname.split('.').pop();

    if (!Object.values(enums.VALID_FILE_TYPES).includes(ext)) {
      return res.error('UNSUPPORTED_FILE_TYPE');
    }

    const fileName = `${slug}-${generateRandomString(10)}-${Date.now()}.${ext}`;

    const uploadParams = {
      Bucket: bucketName,
      Body: file.buffer,
      Key: fileName,
    };

    const bucketRes = await awsStoreBooksInstance.upload(uploadParams).promise();

    File.create({ fileName, fileModule, fileUrl: bucketRes.Location, mimeType: file.mimetype });

    return res.ok({
      message: 'FILE_UPLOADED',
      data: {
        fileUrl: fileName
      },
    });
  } catch (e) {
    return res.internalServerError(e);
  }
};

const getBucketName = (module) => {
  switch (module) {
    case enums.FILE_MODULES.STORE_BOOK:
      return enums.BUCKETS.BOOK;

    case enums.FILE_MODULES.AUTHOR:
      return enums.BUCKETS.AUTHOR;

    case enums.FILE_MODULES.COLLECTION:
      return enums.BUCKETS.COLLECTIONS;

    case enums.FILE_MODULES.CATEGORY:
      return enums.BUCKETS.CATEGORIES;

    case enums.FILE_MODULES.BUNDLE:
      return enums.BUCKETS.BUNDLES;

    case enums.FILE_MODULES.ASSETS:
      return enums.BUCKETS.ASSETS;

    default:
      return enums.BUCKETS.BOOK;
  }
};
