const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { API_URL } = require('./../appConfig');

const { enums, models } = require('./../constants');

const schema = new Schema({
    ISBN: { type: 'String', default: '' },
    title: { type: 'String', default: '' },
    author: { type: 'String', default: '' },
    publicationYear: { type: 'String', default: '' },
    publisher: { type: 'String', default: '' },
    imageSmall: { type: 'String', default: '' },
    imageMedium: { type: 'String', default: '' },
    imageLarge: { type: 'String', default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
    },
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.BOOK, schema);
