const { Schema, model } = require('mongoose');

const { enums, models } = require('./../constants');

const bannerSchema = new Schema({
  poster: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  priority: { type: Number, default: 0 },
});

const faqSchema = new Schema({
  type: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
});

const schema = new Schema({
  faqs: [faqSchema],
  banners: [bannerSchema],
  content: {
    privacyPolicy: {
      content: { type: String, default: '' },
      lastUpdatedAt: { type: String, default: '' },
    },
    termsAndConditions: {
      content: { type: String, default: '' },
      lastUpdatedAt: { type: String, default: '' },
    },
    shippingPolicy: {
      content: { type: String, default: '' },
      lastUpdatedAt: { type: String, default: '' },
    },
    shippingUpdates: {
      content: { type: String, default: '' },
      lastUpdatedAt: { type: String, default: '' },
    },
    purchasePolicy: {
      content: { type: String, default: '' },
      lastUpdatedAt: { type: String, default: '' },
    },
    rentalPolicy: {
      content: { type: String, default: '' },
      lastUpdatedAt: { type: String, default: '' },
    },
  },

  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },

  announcement: { type: String, default: '' },
});
module.exports = model(models.STORE, schema);
