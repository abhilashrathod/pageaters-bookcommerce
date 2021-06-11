const { Schema, model } = require('mongoose');

const { enums, models } = require('./../constants');

const schema = new Schema({
  contactNo: { type: String, default: '' },
  email: { type: String, default: '' },
  announcement: { type: String, default: '' },
  banners: [
    { title: String, default: '' },
    { subTitle: String, default: '' },
    { callToActionUrl: String, default: '' },
    { callToActionText: String, default: '' },
    { imageUrl: String, default: '' },
  ],
});
module.exports = model(models.STORE, schema);
