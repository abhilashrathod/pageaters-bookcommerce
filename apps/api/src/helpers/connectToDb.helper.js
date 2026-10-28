const mongoose = require('mongoose');

const { MONGODB_URL } = require('../appConfig');

module.exports = async () => {
  // connect to database.
  await mongoose.connect(MONGODB_URL);

  console.log('Connected to MongoDB');
};
