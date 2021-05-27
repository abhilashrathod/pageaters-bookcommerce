const path = require('path');
const mongoose = require('mongoose');

const { PROJECT_ROOT, API_URL } = require('./../appConfig');
const { models, enums } = require('./../constants');
const { generateRandomString, writeFile } = require('./../helpers/utils.helper');

const File = mongoose.model(models.FILE);

module.exports.upload = async (req, res) => {
  try {
    let { fileModule = '' } = req.allParams();

    if (!Object.values(enums.FILE_MODULES).includes(fileModule)) {
      return res.error('INVALID_FILE_MODULE');
    }

    const file = req.files[0];

    if (!file) {
      return res.error('NO_FILE_PRESENT');
    }

    const ext = file.originalname.split('.').pop();

    const fileName = `${Date.now()}-${generateRandomString(16)}.${ext}`;

    const tmpFolder = path.join(PROJECT_ROOT, 'resources', 'tmp');

    await writeFile(tmpFolder, fileName, file.buffer);

    await File.create({ fileName, fileModule, mimeType: file.mimetype });

    return res.ok({
      message: 'FILE_UPLOADED',
      data: {
        fileName,
        url: `${API_URL}/resources/tmp/${fileName}`,
      },
    });
  } catch (e) {
    return res.internalServerError(e);
  }
};
