const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models, enums } = require('./../constants');

const schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: models.USER },
    orderId: { type: String, default: '' },

    razorOrderId: { type: String, default: '' },
    razorPaymentId: { type: String, default: '' },
    orderDate: { type: String, default: '' },

    deliveryInstructions: { type: String, default: '' },
    deliveryAddress: { type: Schema.Types.ObjectId, ref: models.ADDRESS },
    shipmentTrackingId: { type: String, default: '' },

    orderStatus: { type: String, enum: Object.values(enums.ORDER_STAGES), default: '' },
    payment: { type: Schema.Types.Mixed, default: null },

    orderHistory: [{
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      time: { type: String, default: '' },
    }],

    requests: [{
      type: { type: String, default: '' }, // return, cancel, replacement
      date: { type: String, default: '' },
      info: {
        reason: { type: String, default: '' },
        comments: { type: String, default: '' },
      },
      status: { type: String, default: '' },
      shipment: { type: String, default: '' },
      books: [{ type: String, default: '' }],
      bundles: [{ type: String, default: '' }],
    }],

    products: [{
      quantity: { type: Number, default: 1 },
      price: { type: Number, default: 1 },
      discount: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
      productTotal: { type: Number, default: 1 },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    }],

    bundles: [{
      quantity: { type: Number, default: 1 },
      price: { type: Number, default: 1 },
      discount: { type: Number, default: 0 },
      total: { type: Number, default: 1 },
      weight: { type: Number, default: 0 },
      bundle: { type: Schema.Types.ObjectId, ref: models.BUNDLE },
    }],

    rentals: [{
      quantity: { type: Number, default: 1 },
      product: { type: Schema.Types.ObjectId, ref: models.STORE_BOOK },
    }],

    boxes: [{
      quantity: { type: Number, default: 1 },
      price: { type: Number, default: 1 },
      discount: { type: Number, default: 0 },
      total: { type: Number, default: 1 },
      weight: { type: Number, default: 0 },
      preferences: {
        preferredAuthors: { type: String, default: '' },
        preferredGenres: { type: String, default: '' },
        favoriteBooks: { type: String, default: '' },
        ignoredBooks: { type: String, default: '' },
      },
      box: { type: Schema.Types.ObjectId, ref: models.MYSTERY_BOX },
    }],

    giftCard: { type: Schema.Types.ObjectId, ref: models.GIFT_CARD, default: null },
    discount: { type: Schema.Types.ObjectId, ref: models.DISCOUNT, default: null },
    storeCreditTransaction: { type: Schema.Types.ObjectId, ref: models.STORE_CREDIT_TRANSACTIONS, default: null },

    giftOptions: {
      isGift: { type: Boolean, default: false },
      details: {
        package: { type: String, default: '' },
        cost: { type: Number, default: 0 },
        message: { type: String, default: '' },
        from: { type: String, default: '' },
      },
    },

    subTotal: { type: Number, default: 0 },
    storeCredit: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      getters: true,
    },
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.ORDER, schema);
