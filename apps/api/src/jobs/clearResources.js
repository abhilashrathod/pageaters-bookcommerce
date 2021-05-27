const fs = require('fs');
const path = require('path');

module.exports.clearResources = async ({} = {}) => {
  console.log('clearResources start');
  return new Promise(async resolve => {
    try {
      let dirs = fs.readdirSync(path.join('.', 'resources', 'tmp'));

      for (const dir of dirs) {
        try {
          const fileTimeStamp = parseInt(dir.split('-')[0]);

          if (fileTimeStamp < Date.now() - 24 * 60 * 60 * 1000) {
            // Delete file if older than 24 hours
            const fullPath = path.resolve('.', 'resources', 'tmp', dir);

            fs.unlinkSync(fullPath);
          }
        } catch (e) {
          //
        }
      }

      console.log('clearResources end');
      return resolve();
    } catch (e) {
      console.log(e);

      console.log('clearResources errored');
      return resolve();
    }
  });
};
