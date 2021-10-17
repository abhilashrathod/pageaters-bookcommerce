const mongoose = require('mongoose');
const axios = require('axios');
const { get } = require('lodash');
const Razorpay = require('razorpay');

const { models } = require('../constants');
const { RAZOR_PAY, DELHIVERY } = require('../appConfig');
const { calculateTotal } = require('../helpers/cart.helper');
const { generateRandomNumber, getId } = require('../helpers/utils.helper');

const Address = mongoose.model(models.ADDRESS);
const User = mongoose.model(models.USER);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);

const razorPayInstance = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });

module.exports.create = async (req, res) => {
  try {
    // let { amount, currency } = req.allParams();
    const cart = get(req, 'cookies.cart', '');
    const userId = get(req, 'user.userId', '');
    const populateOptions = {
      path: 'products.product',
      select: 'bookId title poster author currentDiscount price',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    };

    const cartInfo = await Cart.findOne({ _id: cart }).populate(populateOptions);

    if (!cartInfo) {
      return res.error({ message: 'CART_NOT_EXIST', data: {} });
    }

    let subTotal = await calculateTotal(cartInfo.products);

    const payload = {
      amount: (subTotal * 100),
      currency: 'INR',
      receipt: `OD-${generateRandomNumber()}-RCPTID-01`,


      'id': 'order_IA5z7wAXpNzq8Z',
      'entity': 'order',
      //   "amount": 136500,
      'amount_paid': 0,
      'amount_due': 136500,
      // "currency": "INR",
      // "receipt": "OD-1033875338-RCPTID-01",
      'offer_id': null,
      'status': 'created',
      'attempts': 0,
      'notes': [],
      'created_at': 1634406439,

    };

    console.log('payload', payload);
    // const razorPayOrderResponse = await razorPayInstance.orders.create(payload);

    // return res.ok({ message: 'ORDER_CREATE_SUCCESS', data: razorPayOrderResponse });

    return res.ok({ message: 'ORDER_CREATE_SUCCESS', data: payload });
  } catch (e) {
    return res.internalServerError(e);
  }
};
