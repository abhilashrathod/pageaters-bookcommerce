const fs = require('fs');
const path = require('path');

const en = require('./../src/locales/en');

const localesToSync = ['es'];

/**
 * Populate locale files with missing keys.
 */
function populate() {
  for (const locale of localesToSync) {
    console.log(`Populating ${locale}`);
    try {
      const filePath = path.join('..', 'src', 'locales', `${locale}.json`);

      let file = fs.readFileSync(filePath, 'utf-8');

      file = JSON.parse(file);

      for (const key of Object.keys(en)) {
        file[key] = file[key] || key;
      }

      fs.writeFileSync(filePath, JSON.stringify(file, null, 4) + '\n');
    } catch (e) {
      console.log(e);
    }
  }
}

populate();
