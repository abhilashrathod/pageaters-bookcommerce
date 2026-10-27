const mongoose = require('mongoose');


require('../src/models');

const modelsToLoad = [];

/**
 * Load Seed data to get started with some basic stuff.
 */
async function initSeedData() {
  for (const modelToLoad of modelsToLoad) {
    const model = mongoose.model(modelToLoad.name);

    if (modelToLoad.forceUpdate) {
      await model.deleteMany({});
    }

    const count = await model.countDocuments();

    if (count === 0) {
      console.log(`Processing ${modelToLoad.name}`);

      await model.insertMany(require(`../seedData/${modelToLoad.name}`));
    }
  }

  console.log('Seed data loaded...');
}

module.exports = {
  initSeedData,
};
