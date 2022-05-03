const mongoose = require('mongoose');
const { get } = require('lodash');
const Razorpay = require('razorpay');
const moment = require('moment');

const { models, enums } = require('../constants');
const { RAZOR_PAY, RAZOR_PAY_WEBHOOKS } = require('../appConfig');
const { calculateTotal } = require('../helpers/cart.helper');
const { calculateShipping, calculateTotalWeight, orderPaymentInfo } = require('../helpers/order.helper');
const { getId, generateRandomNumber } = require('../helpers/utils.helper');

const Address = mongoose.model(models.ADDRESS);
const User = mongoose.model(models.USER);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);
const Bundle = mongoose.model(models.BUNDLE);

const razorPayInstance = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });

const populateOptions = [{
  path: 'products.product',
  select: 'bookId title poster author currentDiscount price weight',
  populate: {
    path: 'author',
    select: 'name avatar',
  },
}, {
  path: 'bundles.bundle',
  select: 'bundleId weight title poster bundledBooks currentDiscount price',
  populate: {
    path: 'bundledBooks',
    select: 'bookId title poster author currentDiscount price',
  },
}];

const orderPopulateOptions = [
  {
    path: 'deliveryAddress',
  },
  {
    path: 'products.product',
    select: 'bookId title poster author currentDiscount price',
    populate: {
      path: 'author',
      select: 'name avatar',
    },
  },
  {
    path: 'bundles.bundle',
    select: 'bundleId title poster bundledBooks currentDiscount price',
  },
];

module.exports.attempt = async (req, res) => {
  try {
    const { address, instructions } = req.allParams();
    const userId = get(req, 'user.userId', '');
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];

    const orderId = `OD-${generateRandomNumber(10)}`;

    if (!cart || !userId) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const cartResponse = await Cart.findOne({ _id: cart }).populate(populateOptions);

    if (!cartResponse) {
      return res.error('CART_NOT_EXIST');
    }

    const subTotal = await calculateTotal(cartResponse.products, cartResponse.bundles);
    const totalWeight = await calculateTotalWeight(cartResponse.products, cartResponse.bundles);

    const addressRes = await Address.findOne({ _id: address, userId, isDeleted: false });

    if (!addressRes) {
      return res.error('ORDER_ADDRESS_ATTEMPT_FAILED');
    }

    const shippingRes = await calculateShipping(subTotal >= 300, totalWeight, addressRes.pinCode);
    let shipping = shippingRes.deliveryAmount;

    const orderPayload = {
      userId,
      orderId,
      deliveryInstructions: instructions,
      deliveryAddress: address,
      orderStatus: enums.ORDER_STAGES.ATTEMPTED,
      subTotal,
      total: subTotal + shipping,
      shipping,
    };

    const query = { userId, orderStatus: enums.ORDER_STAGES.ATTEMPTED };

    const currentOrder = await Order.findOne(query);

    if (currentOrder) {
      await Order.findOneAndUpdate(query, { $set: orderPayload }, { new: true });
    } else {
      await Order.create(orderPayload);
    }

    return res.ok({ message: 'ORDER_ADDRESS_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.create = async (req, res) => {
  try {
    const cart = req.cookies[enums.TOKEN_ID.CART_COOKIE];
    const userId = get(req, 'user.userId', '');

    let total;
    let shipping;
    let discount = 0;
    let giftCard = 0;

    if (!cart || !userId) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    let checkIsCreatedOrder = await Order.findOne({ userId, orderStatus: enums.ORDER_STAGES.CREATED });

    if (checkIsCreatedOrder) {
      return res.ok({ message: 'ORDER_CREATE_SUCCESS', data: checkIsCreatedOrder });
    }

    const currentOrderRes = await Order.findOne({ userId, orderStatus: enums.ORDER_STAGES.ATTEMPTED });

    if (!currentOrderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const cartInfoRes = await Cart.findOne({ _id: cart, user: userId }).populate(populateOptions);

    if (!cartInfoRes) {
      return res.error('CART_NOT_EXIST');
    }

    /* CALCULATING ORDER AMOUNT */
    let selectionString = 'currentDiscount price membersPrice inventory weight';
    const books = cartInfoRes.products;
    const bundles = cartInfoRes.bundles;

    let finalProducts = [];

    for (let book of books) {
      const bookRes = await Book.findOne({ isDeleted: false, _id: book.product._id }).select(selectionString);
      const item = {
        quantity: book.quantity,
        price: bookRes.price,
        discount: bookRes.currentDiscount,
        productTotal: book.quantity * (bookRes.price - ((bookRes.currentDiscount * bookRes.price) / 100)),
        product: book.product,
        weight: bookRes.weight * book.quantity,
      };
      finalProducts.push(item);
    }

    let finalBundles = [];

    for (let bundleItem of bundles) {
      const bundleRes = await Bundle.findOne({ isDeleted: false, _id: bundleItem.bundle._id })
        .select('currentDiscount weight bundledBooks price')
        .populate({
          path: 'bundledBooks',
          select: 'bookId title poster author currentDiscount price inventory weight',
        });

      const item = {
        quantity: bundleItem.quantity,
        price: bundleRes.price,
        discount: bundleRes.currentDiscount,
        total: bundleItem.quantity * (bundleRes.price - ((bundleRes.currentDiscount * bundleRes.price) / 100)),
        bundle: bundleItem.bundle._id,
        weight: bundleRes.weight * bundleItem.quantity,
      };
      finalBundles.push(item);
    }

    let subTotal = await calculateTotal(books, bundles);
    let totalWeight = await calculateTotalWeight(books, bundles);

    /* END CALCULATING ORDER AMOUNT */

    /* CALCULATE SHIPPING AMOUNT */
    const addressRes = await Address.findOne({ isDeleted: false, _id: currentOrderRes.deliveryAddress, userId });
    const shippingRes = await calculateShipping(subTotal >= 300, totalWeight, addressRes.pinCode);
    shipping = shippingRes.deliveryAmount;
    /* END CALCULATE SHIPPING AMOUNT */

    /* TODO: DO SOME GIFT CART DEDUCTION IF ANY */

    /* TODO: DO SOME DISCOUNT DEDUCTION IF ANY */

    /* ADDING EVERYTHING UP! */
    total = subTotal + shipping + discount + giftCard;

    const payload = {
      amount: total * 100,
      currency: 'INR',
      receipt: `${currentOrderRes.orderId}-RCPTID`,
    };

    const razorPayOrderResponse = await razorPayInstance.orders.create(payload);

    currentOrderRes.razorOrderId = razorPayOrderResponse.id;
    currentOrderRes.orderStatus = enums.ORDER_STAGES.CREATED;
    currentOrderRes.products = finalProducts;
    currentOrderRes.bundles = finalBundles;
    currentOrderRes.weight = totalWeight;
    currentOrderRes.subTotal = subTotal;
    currentOrderRes.shipping = shipping;
    currentOrderRes.total = total;
    currentOrderRes.orderDate = new Date().toISOString();
    currentOrderRes.giftCard = null; // here goes the gift card id
    currentOrderRes.discount = null; // here goes the discount id
    await currentOrderRes.save();

    /* TODO: SEND EMAIL TO USER */

    /* TODO: SEND TEXT-MESSAGE TO USER */

    return res.ok({
      message: 'ORDER_CREATE_SUCCESS',
      data: { razorOrderId: razorPayOrderResponse.id, total, orderId: currentOrderRes.orderId },
    });
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
      const orderRes = await Order.findOne({
        orderStatus: enums.ORDER_STAGES.CREATED,
        razorOrderId: orderId,
      }).populate(populateOptions);
      if (orderRes) {
        orderRes.orderHistory.push({
          title: enums.ORDER_STAGES.PAID,
          description: 'We have received your order. Preparing shipment',
          time: new Date().toISOString(),
        });
        orderRes.orderStatus = enums.ORDER_STAGES.PAID;
        orderRes.payment = get(payload, 'payment.entity', {});
        orderRes.razorPaymentId = paymentId;
        orderRes.orderDate = new Date().toISOString();
        await orderRes.save();

        const userRes = await User.findOne({ _id: orderRes.userId });
        userRes.currentOrder = null;
        await userRes.save();

        // deduct inventory
        for (let book of orderRes.products) {
          const bookRes = await Book.findOne({
            isDeleted: false,
            _id: book.product._id,
          }).select('currentDiscount price membersPrice inventory weight');
          bookRes.inventory = bookRes.inventory - book.quantity;
          bookRes.save();
        }

        for (let bundleItem of orderRes.bundles) {
          const bundleRes = await Bundle.findOne({ isDeleted: false, _id: bundleItem.bundle._id })
            .select('currentDiscount bundledBooks price')
            .populate({
              path: 'bundledBooks',
              select: 'bookId title poster author currentDiscount price inventory weight',
            });

          for (let bundledBook of bundleRes.bundledBooks) {
            const bookRes = await Book.findOne({
              isDeleted: false,
              _id: bundledBook._id,
            }).select('currentDiscount price membersPrice inventory weight');
            bookRes.inventory = bookRes.inventory - bundleItem.quantity;
            bookRes.save();
          }
        }

        // clear the cart
        await Cart.findOneAndUpdate({ user: orderRes.userId }, {
          $set: {
            products: [],
            bundles: [],
            subTotal: 0,
          },
        }, { new: true });

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

module.exports.getByUniqueId = async (req, res) => {
  try {
    const { uniqueId } = req.allParams();
    const userId = get(req, 'user.userId', '');

    let orderRes = await Order.findOne({ orderId: uniqueId, userId })
      .select(`orderId orderDate deliveryAddress shipmentTrackingId orderHistory payment orderStatus subTotal products bundles shipping total`)
      .populate(orderPopulateOptions);

    orderRes = orderRes.toObject();
    orderRes.payment = orderPaymentInfo(orderRes.payment);

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
    const populate = [
      {
        path: 'deliveryAddress',
      },
      {
        path: 'products.product',
        select: 'bookId title poster author currentDiscount price',
        populate: { path: 'author', select: 'name avatar' },
      },
      {
        path: 'bundles.bundle',
        select: 'bundleId title poster bundledBooks currentDiscount price',
      },
      {
        path: 'requests.books',
        select: 'bookId title poster author currentDiscount price',
        populate: { path: 'author', select: 'name avatar' },
      },
      {
        path: 'requests.bundles',
        select: 'bundleId title poster bundledBooks currentDiscount price',
      },
    ];

    const orderRes = await Order.findOne({ _id: id }).populate(populate);

    if (orderRes) {
      return res.ok({ message: 'ORDER_LIST_SUCCESS', data: orderRes });
    }

    return res.error('ORDER_NOT_EXIST');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getAllByUser = async (req, res) => {
  try {
    const userId = get(req, 'user.userId', '');
    const orderRes = await Order.find({
      userId: userId,
      orderStatus: { $nin: [enums.ORDER_STAGES.ATTEMPTED, enums.ORDER_STAGES.CREATED] },
    })
      .select(`orderId orderDate deliveryAddress orderStatus products bundles total`)
      .sort({ createdAt: -1 })
      .populate(orderPopulateOptions);

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

    const orderRes = await Order.findOne({
      userId,
      orderStatus: enums.ORDER_STAGES.ATTEMPTED,
    }).populate(orderPopulateOptions);

    if (orderRes) {
      return res.ok({ message: 'ORDER_LIST_SUCCESS', data: orderRes });
    }

    return res.error('ORDER_INFO_ATTEMPT_FAILED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.allParams();

    const query = {
      orderStatus: { $nin: [enums.ORDER_STAGES.ATTEMPTED, enums.ORDER_STAGES.CREATED] },
    };

    const options = {
      page,
      limit,
      select: `orderId orderDate userId deliveryAddress orderStatus products bundles total`,
      sort: {
        updatedAt: 'desc',
      },
      populate: [{
        path: 'deliveryAddress',
      }, {
        path: 'userId',
        select: 'fullName email contactNo',
      }, {
        path: 'products.product',
        select: 'bookId title currentDiscount price',
      }, {
        path: 'bundles.bundle',
        select: 'bundleId title bundledBooks currentDiscount price',
      }],
    };

    const order = await Order.paginate(query, options);

    return res.ok({ message: 'CART_LIST_SUCCESS', data: order });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.ship = async (req, res) => {
  try {
    let { orderId, shipmentTrackingId } = req.allParams();

    const orderRes = await Order.findOne({ _id: orderId, orderStatus: enums.ORDER_STAGES.PAID });

    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    orderRes.orderStatus = enums.ORDER_STAGES.SHIPPED;
    orderRes.shipmentTrackingId = shipmentTrackingId;
    orderRes.orderHistory.push({
      title: enums.ORDER_STAGES.SHIPPED,
      description: 'Order hand over to shipment company. Your books are on their way',
      time: new Date().toISOString(),
    });

    await orderRes.save();

    // TODO: send email about this!

    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: orderRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.completeShipment = async (req, res) => {
  try {
    let { id } = req.allParams();

    const orderRes = await Order.findOne({ _id: id, orderStatus: enums.ORDER_STAGES.SHIPPED });

    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    orderRes.orderStatus = enums.ORDER_STAGES.FULFILLED;
    orderRes.orderHistory.push({
      title: enums.ORDER_STAGES.FULFILLED,
      description: 'Shipment delivered. Happy reading!',
      time: new Date().toISOString(),
    });

    await orderRes.save();

    // TODO: send email about this!
    // TODO: In mail ask for review and delivery experience

    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: orderRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.returnRequest = async (req, res) => {
  try {
    let { uniqueId, type, comments, reason, books, bundles } = req.allParams();

    const userId = get(req, 'user.userId', '');
    const period = 7;

    let orderRes = await Order.findOne({ orderId: uniqueId, userId, orderStatus: enums.ORDER_STAGES.FULFILLED });
    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const fulfilledInfo = orderRes.orderHistory.find(x => x.title === enums.ORDER_STAGES.FULFILLED);
    const currentDate = moment().subtract(period, 'days').toDate().toISOString();

    if (fulfilledInfo.time >= currentDate) { // if true then valid return period
      const log = {};
      const requestInfo = {
        type,
        date: new Date().toISOString(),
        info: {
          reason,
          comments,
        },
        status: enums.ORDER_REQUEST_STATUS.OPEN,
        books,
        bundles,
      };

      if (type === enums.ORDER_REQUEST_TYPES.RETURN) {
        log.title = enums.ORDER_STAGES.RETURNED;
        log.description = 'Return request is received. Return shipment will be aligned shortly and refund will be done after shipment is reached us.';
        log.time = new Date().toISOString();
        orderRes.orderStatus = enums.ORDER_STAGES.RETURNED;
      }
      if (type === enums.ORDER_REQUEST_TYPES.REPLACE) {
        orderRes.orderStatus = enums.ORDER_STAGES.REPLACEMENT;
        log.title = enums.ORDER_STAGES.REPLACEMENT;
        log.description = 'Replacement request is received. A new set of books will be dispatched from our side and pickup will be arranged soon';
        log.time = new Date().toISOString();
      }
      orderRes.orderHistory.push(log);
      orderRes.requests.push(requestInfo);

      await orderRes.save();

      // TODO: send email about this!

      return res.ok({ message: 'ORDER_RETURN_SUCCESS', data: {} });
    }
    return res.ok('ORDER_RETURN_PERIOD_LAPSED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.cancelRequest = async (req, res) => {
  try {
    const { uniqueId, reason, comments } = req.allParams();
    const userId = get(req, 'user.userId', '');
    const PERIOD = 3;

    const query = {
      $or: [{ orderStatus: enums.ORDER_STAGES.PAID }, { orderStatus: enums.ORDER_STAGES.SHIPPED }],
      orderId: uniqueId,
      userId,
    };

    const orderRes = await Order.findOne(query);

    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const orderDate = orderRes.orderDate;
    const currentDate = moment().subtract(PERIOD, 'days').toDate().toISOString();

    if (orderDate >= currentDate) {
      const requestInfo = {
        type: enums.ORDER_REQUEST_TYPES.CANCEL,
        date: new Date().toISOString(),
        info: {
          reason,
          comments,
        },
        status: enums.ORDER_REQUEST_STATUS.OPEN,
        books: [],
        bundles: [],
      };

      orderRes.orderStatus = enums.ORDER_STAGES.CANCELLED;
      orderRes.orderHistory.push({
        title: enums.ORDER_STAGES.CANCELLED,
        description: 'Order cancelled by customer. Refund will be aligned shortly.',
        time: new Date().toISOString(),
      });

      orderRes.requests.push(requestInfo);
      await orderRes.save();

      // TODO: send email about this

      return res.ok({ message: 'ORDER_CANCEL_SUCCESS', data: {} });
    }

    return res.error('ORDER_CANCEL_PERIOD_LAPSED');
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.alignReturnShipment = async (req, res) => {
  try {
    let { id, requestId, shipment } = req.allParams();

    const q = {
      $or: [{ orderStatus: enums.ORDER_STAGES.RETURNED }, { orderStatus: enums.ORDER_STAGES.REPLACEMENT }],
      _id: id,
    };

    let orderRes = await Order.findOne(q);
    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const orderStatus = orderRes.orderStatus;
    const log = {};
    let newOrderStatus = '';

    if (orderStatus === enums.ORDER_STAGES.RETURNED) {
      newOrderStatus = enums.ORDER_STAGES.RETURNED_IN_PROGRESS;
      log.title = enums.ORDER_STAGES.RETURNED_IN_PROGRESS;
      log.description = 'Return has been processed and reverse shipment is aligned';
      log.time = new Date().toISOString();
    }

    if (orderStatus === enums.ORDER_STAGES.REPLACEMENT) {
      newOrderStatus = enums.ORDER_STAGES.REPLACEMENT_IN_PROGRESS;
      log.title = enums.ORDER_STAGES.REPLACEMENT_IN_PROGRESS;
      log.description = 'Replacement has been processed and shipment of new books has been created. They will be with you soon.';
      log.time = new Date().toISOString();
    }

    const query = { _id: id, 'requests._id': getId(requestId) };
    const update = {
      $set: {
        orderStatus: newOrderStatus,
        shipmentTrackingId: shipment,
        'requests.$.status': enums.ORDER_REQUEST_STATUS.IN_PROGRESS,
        'requests.$.shipment': shipment,
      },
      $push: {
        orderHistory: log,
      },
    };
    const options = { new: true };

    await Order.findOneAndUpdate(query, update, options);

    // TODO: send email about this!
    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.closeReturnRequest = async (req, res) => {
  try {
    let { id, requestId } = req.allParams();

    let orderRes = await Order.findOne({ _id: id, orderStatus: enums.ORDER_STAGES.RETURNED_IN_PROGRESS });
    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const orderLog = {
      title: 'Return Success',
      description: 'Return has been completed from our side. Refund will be issued soon.',
      time: new Date().toISOString(),
    };

    const query = { _id: id, 'requests._id': getId(requestId) };
    const update = {
      $set: {
        orderStatus: enums.ORDER_STAGES.RETURNED,
        shipmentTrackingId: '',
        'requests.$.status': enums.ORDER_REQUEST_STATUS.CLOSED,
        'requests.$.shipment': '',
      },
      $push: {
        orderHistory: orderLog,
      },
    };
    const options = { new: true };

    await Order.findOneAndUpdate(query, update, options);

    // TODO: send email about this!

    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.closeReplaceRequest = async (req, res) => {
  try {
    let { id, requestId } = req.allParams();

    let orderRes = await Order.findOne({ _id: id, orderStatus: enums.ORDER_STAGES.REPLACEMENT_IN_PROGRESS });
    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const orderLog = {
      title: 'Replacement Success',
      description: 'Replacement has been completed with a fresh set of books. Happy Reading!',
      time: new Date().toISOString(),
    };

    const query = { _id: id, 'requests._id': getId(requestId) };
    const update = {
      $set: {
        orderStatus: enums.ORDER_STAGES.FULFILLED,
        shipmentTrackingId: '',
        'requests.$.status': enums.ORDER_REQUEST_STATUS.CLOSED,
        'requests.$.shipment': '',
      },
      $push: {
        orderHistory: orderLog,
      },
    };
    const options = { new: true };

    await Order.findOneAndUpdate(query, update, options);

    // TODO: send email about this!

    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: {} });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.completeRefund = async (req, res) => {
  try {
    const { payload } = req.allParams();
    const signature = req.get('x-razorpay-signature');
    const body = JSON.stringify(req.body);

    if (!signature) {
      return res.json({ status: 'ok' });
    }

    const isValid = Razorpay.validateWebhookSignature(body, signature, RAZOR_PAY_WEBHOOKS.PAYMENT_REFUND_COMPLETE);

    if (isValid) {
      const orderId = get(payload, 'payment.entity.order_id', '');

      const orderRes = await Order.findOne({ razorOrderId: orderId }).populate(populateOptions);

      if (orderRes) {
        orderRes.orderHistory.push({
          title: enums.ORDER_STAGES.REFUNDED,
          description: 'Refund is successfully processed. It will be with you in 5-7 business days. Thank you.',
          time: new Date().toISOString(),
        });
        orderRes.orderStatus = enums.ORDER_STAGES.REFUNDED;
        orderRes.payment = get(payload, 'payment.entity', {});
        await orderRes.save();

        return res.json({ status: 'ok' });
      }
      return res.json({ status: 'ok' });
    }
    return res.json({ status: 'ok' });
  } catch (e) {
    return res.internalServerError(e);
  }
};
