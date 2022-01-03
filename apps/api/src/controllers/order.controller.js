const mongoose = require('mongoose');
const { get, sumBy } = require('lodash');
const Razorpay = require('razorpay');
const colors = require('colors');

const { models, enums } = require('../constants');
const { RAZOR_PAY, RAZOR_PAY_WEBHOOKS } = require('../appConfig');
const { calculateTotal } = require('../helpers/cart.helper');
const { calculateShipping } = require('../helpers/order.helper');
const { generateRandomNumber } = require('../helpers/utils.helper');

const Address = mongoose.model(models.ADDRESS);
const User = mongoose.model(models.USER);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);

const razorPayInstance = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });

module.exports.attempt = async (req, res) => {
  try {
    const { address, instructions } = req.allParams();
    const cart = get(req, 'cookies.cart', '');
    const userId = get(req, 'user.userId', '');
    const orderId = `OD-${generateRandomNumber()}`;

    if (!cart || !userId) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const populateOptions = {
      path: 'products.product',
      select: 'bookId title poster author currentDiscount price',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    };

    const isCartValid = await Cart.findOne({ _id: cart }).populate(populateOptions);

    if (!isCartValid) {
      return res.error('CART_NOT_EXIST');
    }

    const subTotal = await calculateTotal(isCartValid.products);
    const isAddressValid = await Address.findOne({ _id: address, userId, isDeleted: false });

    if (!isAddressValid) {
      return res.error('ORDER_ADDRESS_ATTEMPT_FAILED');
    }

    const orderPayload = {
      userId,
      orderId,
      deliveryInstructions: instructions,
      deliveryAddress: address,
      orderStatus: enums.ORDER_STAGES.ATTEMPTED,
      subTotal,
    };

    const userRes = await User.findOne({ _id: userId });
    let orderRes;

    if (userRes.currentOrder) {
      orderRes = await Order.findOneAndUpdate({ _id: userRes.currentOrder }, { $set: orderPayload }, { new: true });
    } else {
      orderRes = await Order.create(orderPayload);
    }

    userRes.currentOrder = orderRes._id;
    userRes.save();

    return res.ok({ message: 'ORDER_ADDRESS_SUCCESS', data: orderRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const cart = get(req, 'cookies.cart', '');
    const userId = get(req, 'user.userId', '');
    let total = 0;
    let shipping = 0;
    let weight = 0;
    let discount = 0;
    let giftCard = 0;

    if (!cart || !userId) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const userRes = await User.findOne({ _id: userId });

    if (!userRes) return res.error('ORDER_INFO_ATTEMPT_FAILED');

    let currentlyProcessingOrder = userRes.currentOrder;

    const currentOrderRes = await Order.findOne({ _id: currentlyProcessingOrder });

    if (currentOrderRes.orderStatus === enums.ORDER_STAGES.CREATED) {
      return res.ok({ message: 'ORDER_CREATE_SUCCESS', data: currentOrderRes });
    }

    const populateOptions = {
      path: 'products.product',
      select: 'bookId title poster author currentDiscount price',
      populate: {
        path: 'author',
        select: 'name avatar',
      },
    };

    const cartInfoRes = await Cart.findOne({ _id: cart, user: userId }).populate(populateOptions);

    if (!cartInfoRes) {
      return res.error('CART_NOT_EXIST');
    }

    /* CALCULATING ORDER AMOUNT */
    let selectionString = 'currentDiscount price membersPrice inventory weight';
    const books = cartInfoRes.products;

    let finalProducts = [];

    for (let book of books) {
      const bookRes = await Book.findOne({ isDeleted: false, _id: book.product._id }).select(selectionString);

      if (book.quantity <= bookRes.inventory) {
        const item = {
          quantity: book.quantity,
          price: bookRes.price,
          discount: bookRes.currentDiscount,
          productTotal: book.quantity * (bookRes.price - ((bookRes.currentDiscount * bookRes.price) / 100)),
          product: book.product,
          weight: bookRes.weight * book.quantity,
        };
        finalProducts.push(item);
        bookRes.inventory = bookRes.inventory - book.quantity;
        bookRes.save();
      } else {
        // need to think about this...
        console.error(colors.red(`QTY IS OUT FOR ${book.product.title}`));
      }
    }

    let subTotal = sumBy(finalProducts, (obj) => obj.productTotal);
    let totalWeight = sumBy(finalProducts, (obj) => obj.weight);

    /* END CALCULATING ORDER AMOUNT */

    /* CALCULATE SHIPPING AMOUNT */
    const addressRes = await Address.findOne({ isDeleted: false, _id: currentOrderRes.deliveryAddress, userId });
    const shippingRes = await calculateShipping( subTotal >= 300, totalWeight, addressRes.pinCode);
    shipping = shippingRes.deliveryAmount;
    /* END CALCULATE SHIPPING AMOUNT */

    /* TODO: DO SOME GIFT CART DEDUCTION IF ANY */

    /* TODO: DO SOME DISCOUNT DEDUCTION IF ANY */

    /* ADDING EVERYTHING UP! */
    total = subTotal + shipping + discount + giftCard;

    const payload = {
      amount: total * 100,
      currency: 'INR',
      receipt: `${currentOrderRes.orderId}-RCPTID-01`,
    };

    const razorPayOrderResponse = await razorPayInstance.orders.create(payload);

    currentOrderRes.razorOrderId = razorPayOrderResponse.id;
    currentOrderRes.orderStatus = enums.ORDER_STAGES.CREATED;
    currentOrderRes.products = finalProducts;
    currentOrderRes.giftCard = null; // here goes the gift card id
    currentOrderRes.discount = null; // here goes the discount id
    await currentOrderRes.save();

    /* TODO: SEND EMAIL TO USER */

    /* TODO: SEND TEXT-MESSAGE TO USER */

    /* TODO: CLEAR CART ITEMS */

    return res.ok({ message: 'ORDER_CREATE_SUCCESS', data: currentOrderRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { uniqueId } = req.allParams();
    const userId = get(req, 'user.userId', '');
    const orderRes = await Order.findOne({ orderId: uniqueId, userId });

    if (orderRes) {
      return res.ok({ message: 'ORDER_LIST_SUCCESS', data: orderRes });
    }

    return res.error('ORDER_NOT_EXIST');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getById = async (req, res) => {
  try {
    const { id } = req.allParams();
    const userId = get(req, 'user.userId', '');
    const orderRes = await Order.findOne({ _id: id, userId });

    if (orderRes) {
      return res.ok({ message: 'ORDER_LIST_SUCCESS', data: orderRes });
    }

    return res.error('ORDER_NOT_EXIST');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.retrieve = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const userRes = await User.findOne({ _id: userId, isDeleted: false });

    let orderRes;

    if (userRes.currentOrder) {
      orderRes = await Order.findOne({ _id: userRes.currentOrder });
      return res.ok({ message: 'ORDER_LIST_SUCCESS', data: orderRes });
    }

    return res.error('ORDER_INFO_ATTEMPT_FAILED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.verifyAndConfirm = async (req, res) => {
  try {
    const { payload } = req.allParams();
    const signature = req.get('x-razorpay-signature');
    const body = JSON.stringify(req.body);

    if (!signature) {
      return res.json({ status: 'ok' });
    }

    const paymentId = get(payload, 'payment.entity.id', '');
    const orderId = get(payload, 'payment.entity.order_id', '');

    const isValid = Razorpay.validateWebhookSignature(body, signature, RAZOR_PAY_WEBHOOKS.PAYMENT_CAPTURED);

    if (isValid) {
      const orderRes = await Order.findOne({ orderStatus: enums.ORDER_STAGES.CREATED, razorOrderId: orderId });
      if (orderRes) {
        orderRes.orderStatus = enums.ORDER_STAGES.PAID;
        orderRes.payment = get(payload, 'payment.entity', {});
        orderRes.razorPaymentId = paymentId;
        await orderRes.save();

        const userRes = await User.findOne({_id: orderRes.userId});
        userRes.currentOrder = null;
        await userRes.save();

        return res.json({ status: 'ok' });
      } else {
        return res.json({ status: 'ok' }); // do nothing but send success to webhook
      }
    }

    return res.json({ status: 'ok' });
  } catch (e) {
    return res.internalServerError(e);
  }
};
