const { Schema, model } = require('mongoose');

const { enums, models } = require('./../constants');

const dealSchema = new Schema({
  poster: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  priority: { type: Number, default: -1 },
});

const bannerSchema = new Schema({
  poster: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  priority: { type: Number, default: -1 },
});

const faqSchema = new Schema({
  type: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
});

const schema = new Schema({
  deals: [dealSchema], // should be in multiple of 3
  faqs: [faqSchema],
  banners: [bannerSchema],
  content: {
    privacyPolicy: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    shippingPolicy: { type: String, default: '' },
    shippingUpdates: { type: String, default: '' },
    purchasePolicy: { type: String, default: '' },
    rentalPolicy: { type: String, default: '' },
  },

  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },

  newArrivals: [{ type: Schema.Types.ObjectId, default: models.STORE_BOOK }],
  mostPopular: [{ type: Schema.Types.ObjectId, default: models.STORE_BOOK }],
  bestSellers: [{ type: Schema.Types.ObjectId, default: models.STORE_BOOK }],
  comingSoon:  [{ type: Schema.Types.ObjectId, default: models.STORE_BOOK }],
});
module.exports = model(models.STORE, schema);
