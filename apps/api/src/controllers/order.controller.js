const mongoose = require('mongoose');
const { get } = require('lodash');
const Razorpay = require('razorpay');
const moment = require('moment');
const { parallel } = require('async');

const { models, enums } = require('../constants');
const { RAZOR_PAY, RAZOR_PAY_WEBHOOKS, TWILIO } = require('../appConfig');
const { calculateTotal } = require('../helpers/cart.helper');
const { calculateShipping, calculateTotalWeight, orderPaymentInfo, textMessage, returnProductImage, returnAssetImage, returnBundleImage } = require('../helpers/order.helper');
const { getId, generateRandomNumber } = require('../helpers/utils.helper');
const sendMailQueue = require('./../helpers/sendMailQueue.helper');

const Address = mongoose.model(models.ADDRESS);
const User = mongoose.model(models.USER);
const Order = mongoose.model(models.ORDER);
const Cart = mongoose.model(models.CART);
const Book = mongoose.model(models.STORE_BOOK);
const MysteryBox = mongoose.model(models.MYSTERY_BOX);
const Bundle = mongoose.model(models.BUNDLE);

const razorPayInstance = new Razorpay({ key_id: RAZOR_PAY.USER_ID, key_secret: RAZOR_PAY.PASSWORD });
const twilioClient = require('twilio')(TWILIO.ACCOUNT_SID, TWILIO.AUTH_TOKEN);

const populateOptions = [{
  path: 'products.product',
  select: 'bookId title poster author preOrder currentDiscount price weight',
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
}, {
  path: 'mysteryBoxes.box',
  select: 'boxId title images currentDiscount price weight',
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
  {
    path: 'boxes.box',
    select: 'boxId title images currentDiscount price',
  },
];

module.exports.attempt = async (req, res) => {
  try {
    const { address } = req.allParams();
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

    const isPreOrder = cartResponse.products.find(item => item.product.preOrder);

    const subTotal = await calculateTotal(cartResponse.products, cartResponse.bundles, cartResponse.mysteryBoxes);
    const totalWeight = await calculateTotalWeight(cartResponse.products, cartResponse.bundles, cartResponse.mysteryBoxes);

    const addressRes = await Address.findOne({ _id: address, userId, isDeleted: false });

    if (!addressRes) {
      return res.error('ORDER_ADDRESS_ATTEMPT_FAILED');
    }

    const shippingRes = await calculateShipping((isPreOrder || subTotal > 499), totalWeight, addressRes.pinCode);
    let shipping = shippingRes.deliveryAmount;

    const orderPayload = {
      userId,
      orderId,
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

    const { method, instructions, giftOptions } = req.allParams(); // online | cod

    let total;
    let shipping;
    let discount = 0;
    let giftCard = 0;
    let giftCharges = giftOptions.isGift ? get(giftOptions, 'details.cost', 0) : 0;

    if (!cart || !userId) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const currentOrderRes = await Order.findOne({
      $or: [{ orderStatus: enums.ORDER_STAGES.ATTEMPTED }, { orderStatus: enums.ORDER_STAGES.CREATED }],
      userId,
    }).populate({
      path: 'deliveryAddress',
    });

    if (!currentOrderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const cartInfoRes = await Cart.findOne({ _id: cart, user: userId }).populate(populateOptions);

    if (!cartInfoRes) {
      return res.error('CART_NOT_EXIST');
    }

    const books = cartInfoRes.products;
    const bundles = cartInfoRes.bundles;
    const mysteryBoxes = cartInfoRes.mysteryBoxes;

    const { finalProducts, finalBundles, finalMysteryBoxes } = await prepareItemsForOrder(books, bundles, mysteryBoxes);

    const isPreOrder = books.find(item => item.product.preOrder);
    let subTotal = await calculateTotal(books, bundles, mysteryBoxes);
    let totalWeight = await calculateTotalWeight(books, bundles, mysteryBoxes);

    /* CALCULATE SHIPPING AMOUNT */
    const addressRes = await Address.findOne({ isDeleted: false, _id: currentOrderRes.deliveryAddress._id, userId });
    const shippingRes = await calculateShipping((isPreOrder || subTotal > 499), totalWeight, addressRes.pinCode);
    shipping = shippingRes.deliveryAmount;

    /* END CALCULATE SHIPPING AMOUNT */

    /* TODO: DO SOME GIFT CART DEDUCTION IF ANY */

    /* TODO: DO SOME DISCOUNT DEDUCTION IF ANY */

    /* ADDING EVERYTHING UP! */
    total = subTotal + shipping + discount + giftCard + giftCharges;

    let razorPayOrderResponse, payload;

    if (method === 'online') {
      payload = {
        amount: total * 100,
        currency: 'INR',
        receipt: `${currentOrderRes.orderId}-RCPTID`,
      };

      razorPayOrderResponse = await razorPayInstance.orders.create(payload);
    }

    currentOrderRes.razorOrderId = method === 'online' ? razorPayOrderResponse.id : '';
    currentOrderRes.orderStatus = method === 'online' ? enums.ORDER_STAGES.CREATED : enums.ORDER_STAGES.CONFIRMED;
    currentOrderRes.products = finalProducts;
    currentOrderRes.bundles = finalBundles;
    currentOrderRes.boxes = finalMysteryBoxes;
    currentOrderRes.weight = totalWeight;
    currentOrderRes.giftOptions = giftOptions;
    currentOrderRes.deliveryInstructions = instructions;
    currentOrderRes.subTotal = subTotal;
    currentOrderRes.shipping = shipping;
    currentOrderRes.total = total;
    currentOrderRes.orderDate = new Date().toISOString();
    currentOrderRes.giftCard = null; // here goes the gift card id
    currentOrderRes.discount = null; // here goes the discount id

    if (method === 'cod') {
      currentOrderRes.orderHistory.push({
        title: enums.ORDER_STAGES.CONFIRMED,
        description: 'We have received your order. Preparing shipment',
        time: new Date().toISOString(),
      });
      currentOrderRes.payment = { method: 'cod' };
    }

    await currentOrderRes.save();

    if (method === 'online') {
      return res.ok({
        message: 'ORDER_CREATE_SUCCESS',
        data: { razorOrderId: razorPayOrderResponse.id, total, orderId: currentOrderRes.orderId },
      });
    }

    if (method === 'cod') {
      const userRes = await User.findOne({ _id: currentOrderRes.userId });

      // deduct inventory
      await deductInventory(currentOrderRes);

      // reset and clear card after order success
      await resetCart(currentOrderRes.userId);

      // send SMS
      await sendConfirmationMessage(userRes, currentOrderRes.orderId);

      // send EMAIL
      await sendConfirmationEmail(userRes, currentOrderRes);

      return res.ok({
        message: 'ORDER_CREATE_SUCCESS',
        data: { total, orderId: currentOrderRes.orderId },
      });
    }

    return res.ok();
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
      }).populate(orderPopulateOptions);

      if (orderRes) {
        orderRes.orderHistory.push({
          title: enums.ORDER_STAGES.PAID,
          description: 'We have received your order. Preparing shipment',
          time: new Date().toISOString(),
        });
        orderRes.orderStatus = enums.ORDER_STAGES.PAID;
        orderRes.payment = get(payload, 'payment.entity', {});
        orderRes.razorPaymentId = paymentId;
        await orderRes.save();

        const userRes = await User.findOne({ _id: orderRes.userId });

        // deduct inventory
        await deductInventory(orderRes);

        // reset and clear card after order success
        await resetCart(orderRes.userId);

        // send SMS
        await sendConfirmationMessage(userRes, orderRes.orderId);

        // send EMAIL
        await sendConfirmationEmail(userRes, orderRes);

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
      .select(`orderId orderDate giftOptions deliveryAddress shipmentTrackingId orderHistory payment orderStatus subTotal products boxes bundles shipping total`)
      .populate(orderPopulateOptions);

    if (orderRes) {
      orderRes = orderRes.toObject();
      orderRes.payment = orderPaymentInfo(orderRes.payment);

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
        path: 'boxes.box',
        select: 'boxId title images currentDiscount price weight',
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
      .select(`orderId orderDate deliveryAddress orderStatus products boxes bundles total`)
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
      $or: [{ orderStatus: enums.ORDER_STAGES.ATTEMPTED }, { orderStatus: enums.ORDER_STAGES.CREATED }],
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
    let { page, limit, status } = req.allParams();

    const query = {
      $and: [
        { orderStatus: { $nin: [enums.ORDER_STAGES.ATTEMPTED, enums.ORDER_STAGES.CREATED] } },
      ]
    };

    if (status) {
      query.$and.push({ orderStatus: status });
    }

    const options = {
      page,
      limit,
      select: `orderId orderDate userId deliveryAddress orderStatus products boxes bundles total`,
      sort: {
        updatedAt: 'desc',
      },
      populate: [
        {
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
        }, {
          path: 'boxes.box',
          select: 'boxId title images currentDiscount price',
        },
      ],
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

    const populateOptions = [{
      path: 'userId',
      select: 'fullName email contactNo',
    }, {
      path: 'deliveryAddress',
    }];
    const orderRes = await Order.findOne({
      _id: orderId,
      $or: [{ orderStatus: enums.ORDER_STAGES.PAID }, { orderStatus: enums.ORDER_STAGES.CONFIRMED }],
    }).populate(populateOptions);

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

    const emailBody = {
      emailModule: 'ORDER_SHIPPED',
      to: orderRes.userId.email,
      subject: `Order #${orderRes.orderId} is Shipped - Pageaters`,
      data: {
        ORDER_ID: orderRes.orderId,
        ORDER_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
        FULL_NAME: orderRes.userId.fullName ? orderRes.userId.fullName : 'Reader',
        SUBTOTAL: orderRes.subTotal,
        SHIPPING: orderRes.shipping,
        TOTAL: orderRes.total,
        ADDRESS: orderRes.deliveryAddress,
      },
    };

    sendMailQueue.add(emailBody);

    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: orderRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.completeShipment = async (req, res) => {
  try {
    let { id } = req.allParams();
    const populateOptions = [{
      path: 'userId',
      select: 'fullName email contactNo',
    }, {
      path: 'deliveryAddress',
    }];

    const orderRes = await Order.findOne({
      _id: id,
      orderStatus: enums.ORDER_STAGES.SHIPPED,
    }).populate(populateOptions);

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

    const emailBody = {
      emailModule: 'ORDER_DELIVERED',
      to: orderRes.userId.email,
      subject: `Your Order #${orderRes.orderId} Is Delivered! - Pageaters`,
      data: {
        ORDER_ID: orderRes.orderId,
        ORDER_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
        FULL_NAME: orderRes.userId.fullName ? orderRes.userId.fullName : 'Reader',
        SUBTOTAL: orderRes.subTotal,
        SHIPPING: orderRes.shipping,
        TOTAL: orderRes.total,
        ADDRESS: orderRes.deliveryAddress,
      },
    };

    sendMailQueue.add(emailBody);

    // TODO: In mail ask for review and delivery experience

    return res.ok({ message: 'ORDER_UPDATE_SUCCESS', data: orderRes });
  } catch (e) {
    return res.internalServerError(e);
  }
};

module.exports.returnRequest = async (req, res) => {
  try {
    let { uniqueId, type, comments, reason, books, bundles } = req.allParams();
    const populateOptions = [{
      path: 'userId',
      select: 'fullName email contactNo',
    }, {
      path: 'deliveryAddress',
    }];

    const userId = get(req, 'user.userId', '');
    const period = 7;

    let orderRes = await Order.findOne({
      orderId: uniqueId,
      userId,
      orderStatus: enums.ORDER_STAGES.FULFILLED,
    }).populate(populateOptions);

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

      const emailBody = {
        emailModule: 'ORDER_REQUESTS',
        to: orderRes.userId.email,
        subject: `${capitalizeFirstLetter(type)} Request is Raised for Order #${orderRes.orderId} - Pageaters`,
        data: {
          REQUEST_TYPE: capitalizeFirstLetter(type),
          REQUEST_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
          ORDER_ID: orderRes.orderId,
          ORDER_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
          FULL_NAME: orderRes.userId.fullName ? orderRes.userId.fullName : 'Reader',
          SUBTOTAL: orderRes.subTotal,
          SHIPPING: orderRes.shipping,
          TOTAL: orderRes.total,
          ADDRESS: orderRes.deliveryAddress,
        },
      };
      sendMailQueue.add(emailBody);

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
    const PERIOD = 3; // 3 days from delivery fulfillment

    const populateOptions = [{
      path: 'userId',
      select: 'fullName email contactNo',
    }];

    const query = {
      $or: [{ orderStatus: enums.ORDER_STAGES.PAID }, { orderStatus: enums.ORDER_STAGES.SHIPPED }, { orderStatus: enums.ORDER_STAGES.CONFIRMED }],
      orderId: uniqueId,
      userId,
    };

    const orderRes = await Order.findOne(query).populate(populateOptions);

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

      const emailBody = {
        emailModule: 'CANCEL_ORDER',
        to: orderRes.userId.email,
        subject: `Order ${orderRes.orderId} Cancellation Confirmation  - Pageaters`,
        data: {
          ORDER_ID: orderRes.orderId,
          FULL_NAME: orderRes.userId.fullName ? orderRes.userId.fullName : 'Reader',
        },
      };
      sendMailQueue.add(emailBody);

      // TODO: Send message

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
    const populateOptions = [{
      path: 'userId',
      select: 'fullName email contactNo',
    }, {
      path: 'deliveryAddress',
    }];

    const q = {
      $or: [{ orderStatus: enums.ORDER_STAGES.RETURNED }, { orderStatus: enums.ORDER_STAGES.REPLACEMENT }],
      _id: id,
    };

    let orderRes = await Order.findOne(q).populate(populateOptions);
    if (!orderRes) {
      return res.error('ORDER_INFO_ATTEMPT_FAILED');
    }

    const orderStatus = orderRes.orderStatus;
    const log = {};
    let newOrderStatus = '';
    let type = '';

    if (orderStatus === enums.ORDER_STAGES.RETURNED) {
      newOrderStatus = enums.ORDER_STAGES.RETURNED_IN_PROGRESS;
      log.title = enums.ORDER_STAGES.RETURNED_IN_PROGRESS;
      log.description = 'Return has been processed and reverse shipment is aligned';
      log.time = new Date().toISOString();
      type = 'return';
    }

    if (orderStatus === enums.ORDER_STAGES.REPLACEMENT) {
      newOrderStatus = enums.ORDER_STAGES.REPLACEMENT_IN_PROGRESS;
      log.title = enums.ORDER_STAGES.REPLACEMENT_IN_PROGRESS;
      log.description = 'Replacement has been processed and shipment of new books has been created. They will be with you soon.';
      log.time = new Date().toISOString();
      type = 'replacement';
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

    const emailBody = {
      emailModule: 'ORDER_RETURN_SHIPMENT',
      to: orderRes.userId.email,
      subject: `${capitalizeFirstLetter(type)} is Aligned for Order #${orderRes.orderId} - Pageaters`,
      data: {
        REQUEST_TYPE: capitalizeFirstLetter(type),
        REQUEST_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
        ORDER_ID: orderRes.orderId,
        ORDER_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
        FULL_NAME: orderRes.userId.fullName ? orderRes.userId.fullName : 'Reader',
        SUBTOTAL: orderRes.subTotal,
        SHIPPING: orderRes.shipping,
        TOTAL: orderRes.total,
        ADDRESS: orderRes.deliveryAddress,
      },
    };
    sendMailQueue.add(emailBody);

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


function returnProducts(products) {
  for (let productItem of products) {
    productItem.product.poster = returnProductImage(productItem.product.poster);
  }

  return products;
}

function returnBundles(bundles) {
  for (let bundleItem of bundles) {
    bundleItem.bundle.poster = returnBundleImage(bundleItem.bundle.poster);
  }

  return bundles;
}

function returnBoxes(boxes) {
  for (let boxItem of boxes) {
    boxItem.box.images[0] = returnAssetImage(boxItem.box.images[0]);
  }

  return boxes;
}

function prepareItemsForOrder(books, bundles, mysteryBoxes) {
  return new Promise(async (resolve, reject) => {
    let finalProducts = [];
    let finalBundles = [];
    let finalMysteryBoxes = [];

    try {
      for (let book of books) {
        const bookRes = await Book.findOne({
          isDeleted: false,
          _id: book.product._id,
        }).select('currentDiscount price membersPrice inventory weight');
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

      for (let boxItem of mysteryBoxes) {
        const myBoxRes = await MysteryBox.findOne({
          isDeleted: false,
          _id: boxItem.box._id,
        }).select('currentDiscount price weight');
        const item = {
          quantity: boxItem.quantity,
          price: myBoxRes.price,
          discount: myBoxRes.currentDiscount,
          preferences: boxItem.preferences,
          total: boxItem.quantity * (myBoxRes.price - ((myBoxRes.currentDiscount * myBoxRes.price) / 100)),
          box: boxItem.box,
          weight: myBoxRes.weight * boxItem.quantity,
        };
        finalMysteryBoxes.push(item);
      }

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

      resolve({
        finalProducts,
        finalBundles,
        finalMysteryBoxes,
      });
    } catch (e) {
      reject({ finalProducts, finalBundles });
    }
  });
}

function resetCart(userId) {
  return new Promise(async (resolve, reject) => {
    await Cart.findOneAndUpdate({ user: userId }, {
      $set: {
        products: [],
        bundles: [],
        mysteryBoxes: [],
        subTotal: 0,
      },
    }, { new: true });
    resolve();
  });
}

function sendConfirmationMessage(userData, orderId) {
  return new Promise(async (resolve, reject) => {
    try {
      if (userData.contactNo) {
        let message = {
          body: textMessage(userData.fullName, userData.email, orderId),
          from: TWILIO.PHONE,
          to: `+91${userData.contactNo}`,
        };

        await twilioClient.messages.create(message);
        resolve();
      }
    } catch (e) {
      resolve();
    }
  });
}

function sendConfirmationEmail(userRes, orderRes) {
  return new Promise((resolve, reject) => {
    try {
      const emailBody = {
        emailModule: 'ORDER_CONFIRMATION',
        to: userRes.email,
        subject: `Order Confirmation #${orderRes.orderId} - Pageaters`,
        data: {
          ORDER_ID: orderRes.orderId,
          ORDER_DATE: moment(orderRes.orderDate).format('DD MMM YYYY'),
          FULL_NAME: userRes.fullName ? userRes.fullName : 'Reader',
          PRODUCTS: returnProducts(orderRes.products),
          BUNDLES: returnBundles(orderRes.bundles),
          BOXES: returnBoxes(orderRes.boxes),
          SUBTOTAL: orderRes.subTotal,
          SHIPPING: orderRes.shipping,
          GIFT_CHARGES: orderRes.giftOptions.isGift ? orderRes.giftOptions.details.cost : -1,
          TOTAL: orderRes.total,
          ADDRESS: orderRes.deliveryAddress,
        },
      };
      sendMailQueue.add(emailBody);
      resolve(true);
    } catch (e) {
      resolve(true);
    }
  });
}

function deductInventory(orderRes) {
  return new Promise(async (resolve, reject) => {
    try {
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

      resolve();
    } catch (e) {
      resolve();
    }
  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
