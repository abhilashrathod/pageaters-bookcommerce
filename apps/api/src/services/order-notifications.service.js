const moment = require('moment');

const { ENVIRONMENT, TWILIO } = require('../appConfig');
const { returnAssetImage, returnBundleImage, returnProductImage } = require('../helpers/image-url.helper');
const sendMailQueue = require('../helpers/sendMailQueue.helper');

// The shopper's order e-mails and the confirmation SMS. E-mails go through the in-process mail queue
// (helpers/sendMailQueue.helper.js), which renders src/templates/email/<module> and sends after the response.
// The adapters step replaces Twilio and the queue; until then this is the only place orders reach them.

const twilioClient = require('twilio')(TWILIO.ACCOUNT_SID, TWILIO.AUTH_TOKEN);

const isProduction = () => ENVIRONMENT === 'production';
const formatDate = (date) => moment(date).format('DD MMM YYYY');
const readerName = (user) => (user.fullName ? user.fullName : 'Reader');
const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

/**
 * The order confirmation SMS text, addressed to the buyer's name or, without one, the local part of their e-mail.
 * @param {string} [name]
 * @param {string} email
 * @param {string} orderId Public order id (`OD-…`).
 * @returns {string}
 */
const textMessage = (name, email, orderId) =>
  `Hi ${name ? name : email.split('@')[0]}, Your order#${orderId} has been confirmed! Track your order progress in Account > Orders section. Happy Reading! -- Team Pageaters.`;

// The order summary most templates share. `order.userId` is the populated buyer.
const orderSummary = (order) => ({
  ORDER_ID: order.orderId,
  ORDER_DATE: formatDate(order.orderDate),
  FULL_NAME: readerName(order.userId),
  SUBTOTAL: order.subTotal,
  SHIPPING: order.shipping,
  TOTAL: order.total,
  ADDRESS: order.deliveryAddress,
});

// Request e-mails put the request type first and use the order date as the request date (legacy).
const requestSummary = (order, type) => ({
  REQUEST_TYPE: capitalizeFirstLetter(type),
  REQUEST_DATE: formatDate(order.orderDate),
  ...orderSummary(order),
});

// Rewrite populated item images to CDN URLs in place and return the same array (legacy).
const withCdnImages = (items, path, field, toUrl) => {
  for (const item of items) item[path][field] = toUrl(item[path][field]);
  return items;
};
const withCdnBoxImages = (boxes) => {
  for (const item of boxes) item.box.images[0] = returnAssetImage(item.box.images[0]);
  return boxes;
};

/**
 * Texts the order confirmation to the buyer's number, in production only and only when the account has one.
 * Never fails: a Twilio error is swallowed (legacy). Outside production nothing is sent (the legacy code logged the
 * text, which holds the buyer's name or e-mail; that log line is dropped).
 * @param {{ fullName?: string, email: string, contactNo?: string }} user
 * @param {string} orderId Public order id (`OD-…`).
 * @returns {Promise<void>}
 */
const sendConfirmationSms = async (user, orderId) => {
  if (!isProduction()) return;
  try {
    if (!user.contactNo) return;
    await twilioClient.messages.create({
      body: textMessage(user.fullName, user.email, orderId),
      from: TWILIO.PHONE,
      to: `+91${user.contactNo}`,
    });
  } catch {
    // legacy: a failed SMS never fails the order
  }
};

/**
 * Queues the order confirmation e-mail, in production only. Rewrites the populated product, bundle and box images
 * to CDN URLs on the order in place (legacy). Never fails.
 * @param {{ fullName?: string, email: string }} user
 * @param {object} order Order with populated items and delivery address.
 * @returns {void}
 */
const sendConfirmationEmail = (user, order) => {
  if (!isProduction()) return;
  try {
    sendMailQueue.add({
      emailModule: 'ORDER_CONFIRMATION',
      to: user.email,
      subject: `Order Confirmation #${order.orderId} - Pageaters`,
      data: {
        ORDER_ID: order.orderId,
        ORDER_DATE: formatDate(order.orderDate),
        FULL_NAME: readerName(user),
        PRODUCTS: withCdnImages(order.products, 'product', 'poster', returnProductImage),
        BUNDLES: withCdnImages(order.bundles, 'bundle', 'poster', returnBundleImage),
        BOXES: withCdnBoxImages(order.boxes),
        SUBTOTAL: order.subTotal,
        SHIPPING: order.shipping,
        STORE_CREDIT: order.storeCredit,
        GIFT_CHARGES: order.giftOptions.isGift ? order.giftOptions.details.cost : -1,
        TOTAL: order.total,
        ADDRESS: order.deliveryAddress,
      },
    });
  } catch {
    // legacy: a failed confirmation e-mail never fails the order
  }
};

/**
 * Queues the "order shipped" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @returns {void}
 */
const sendShippedEmail = (order) =>
  sendMailQueue.add({
    emailModule: 'ORDER_SHIPPED',
    to: order.userId.email,
    subject: `Order #${order.orderId} is Shipped - Pageaters`,
    data: orderSummary(order),
  });

/**
 * Queues the "order delivered" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @returns {void}
 */
const sendDeliveredEmail = (order) =>
  sendMailQueue.add({
    emailModule: 'ORDER_DELIVERED',
    to: order.userId.email,
    subject: `Your Order #${order.orderId} Is Delivered! - Pageaters`,
    data: orderSummary(order),
  });

/**
 * Queues the "return/replace request raised" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @param {string} type Request type as sent by the shopper. Legacy: a missing type throws a TypeError (→ 500).
 * @returns {void}
 */
const sendRequestEmail = (order, type) =>
  sendMailQueue.add({
    emailModule: 'ORDER_REQUESTS',
    to: order.userId.email,
    subject: `${capitalizeFirstLetter(type)} Request is Raised for Order #${order.orderId} - Pageaters`,
    data: requestSummary(order, type),
  });

/**
 * Queues the "return/replacement shipment aligned" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @param {'return' | 'replacement'} type
 * @returns {void}
 */
const sendReturnShipmentEmail = (order, type) =>
  sendMailQueue.add({
    emailModule: 'ORDER_RETURN_SHIPMENT',
    to: order.userId.email,
    subject: `${capitalizeFirstLetter(type)} is Aligned for Order #${order.orderId} - Pageaters`,
    data: requestSummary(order, type),
  });

/**
 * Queues the shopper-cancellation e-mail, in production only.
 * @param {object} order Order with populated `userId`.
 * @returns {void}
 */
const sendCancelEmail = (order) => {
  if (!isProduction()) return;
  sendMailQueue.add({
    emailModule: 'CANCEL_ORDER',
    to: order.userId.email,
    subject: `Order ${order.orderId} Cancellation Confirmation  - Pageaters`,
    data: { ORDER_ID: order.orderId, FULL_NAME: readerName(order.userId) },
  });
};

/**
 * Queues the admin-cancellation e-mail, in production only and only when `notify` is truthy.
 * @param {object} order Order with populated `userId`.
 * @param {string} reason
 * @param {unknown} notify
 * @returns {void}
 */
const sendAdminCancelEmail = (order, reason, notify) => {
  if (!isProduction() || !notify) return;
  sendMailQueue.add({
    emailModule: 'CLOSE_ORDER',
    to: order.userId.email,
    subject: `Order ${order.orderId} Cancellation Confirmation  - Pageaters`,
    data: { ORDER_ID: order.orderId, FULL_NAME: readerName(order.userId), REASON: reason },
  });
};

module.exports = {
  sendAdminCancelEmail,
  sendCancelEmail,
  sendConfirmationEmail,
  sendConfirmationSms,
  sendDeliveredEmail,
  sendRequestEmail,
  sendReturnShipmentEmail,
  sendShippedEmail,
};
