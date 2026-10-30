const moment = require('moment');

const sms = require('../adapters/sms');
const environment = require('../helpers/environment.helper');
const { imageUrl } = require('../helpers/image-url.helper');
const { sendTemplateMail } = require('./mail.service');

// The shopper's order e-mails and the confirmation SMS. E-mails are rendered and sent through mail.service.js (the
// email adapter), texts through the SMS adapter; both are awaited and never fail the order. The legacy
// production-only gates read `environment.isProduction()` at send time.
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

// Normalise populated item images to their public URLs in place and return the same array (legacy: in place).
const withImageUrls = (items, path, field) => {
  for (const item of items) item[path][field] = imageUrl(item[path][field]);
  return items;
};
const withBoxImageUrls = (boxes) => {
  for (const item of boxes) item.box.images[0] = imageUrl(item.box.images[0]);
  return boxes;
};

/**
 * Texts the order confirmation to the buyer's number, in production only and only when the account has one.
 * Never fails: an SMS adapter error is swallowed (legacy). Outside production nothing is sent (the legacy code logged the
 * text, which holds the buyer's name or e-mail; that log line is dropped).
 * @param {{ fullName?: string, email: string, contactNo?: string }} user
 * @param {string} orderId Public order id (`OD-…`).
 * @returns {Promise<void>}
 */
const sendConfirmationSms = async (user, orderId) => {
  if (!environment.isProduction()) return;
  try {
    if (!user.contactNo) return;
    await sms.send({ to: `+91${user.contactNo}`, body: textMessage(user.fullName, user.email, orderId) });
  } catch {
    // legacy: a failed SMS never fails the order
  }
};

/**
 * Sends the order confirmation e-mail, in production only. Normalises the populated product, bundle and box images
 * to their public URLs on the order in place (legacy: in place). Never fails.
 * @param {{ fullName?: string, email: string }} user
 * @param {object} order Order with populated items and delivery address.
 * @returns {Promise<void>}
 */
const sendConfirmationEmail = async (user, order) => {
  if (!environment.isProduction()) return;
  try {
    await sendTemplateMail({
      emailModule: 'ORDER_CONFIRMATION',
      to: user.email,
      subject: `Order Confirmation #${order.orderId} - Pageaters`,
      data: {
        ORDER_ID: order.orderId,
        ORDER_DATE: formatDate(order.orderDate),
        FULL_NAME: readerName(user),
        PRODUCTS: withImageUrls(order.products, 'product', 'poster'),
        BUNDLES: withImageUrls(order.bundles, 'bundle', 'poster'),
        BOXES: withBoxImageUrls(order.boxes),
        SUBTOTAL: order.subTotal,
        SHIPPING: order.shipping,
        STORE_CREDIT: order.storeCredit,
        GIFT_CHARGES: order.giftOptions.isGift ? order.giftOptions.details.cost : -1,
        TOTAL: order.total,
        ADDRESS: order.deliveryAddress,
      },
    });
  } catch {
    // legacy: a failed confirmation e-mail never fails the order (building the data can throw on a malformed order)
  }
};

/**
 * Sends the "order shipped" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown; only building the data can throw.
 */
const sendShippedEmail = async (order) => {
  await sendTemplateMail({
    emailModule: 'ORDER_SHIPPED',
    to: order.userId.email,
    subject: `Order #${order.orderId} is Shipped - Pageaters`,
    data: orderSummary(order),
  });
};

/**
 * Sends the "order delivered" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown; only building the data can throw.
 */
const sendDeliveredEmail = async (order) => {
  await sendTemplateMail({
    emailModule: 'ORDER_DELIVERED',
    to: order.userId.email,
    subject: `Your Order #${order.orderId} Is Delivered! - Pageaters`,
    data: orderSummary(order),
  });
};

/**
 * Sends the "return/replace request raised" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @param {string} type Request type as sent by the shopper. Legacy: a missing type throws a TypeError (→ 500).
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown; only building the data can throw.
 */
const sendRequestEmail = async (order, type) => {
  await sendTemplateMail({
    emailModule: 'ORDER_REQUESTS',
    to: order.userId.email,
    subject: `${capitalizeFirstLetter(type)} Request is Raised for Order #${order.orderId} - Pageaters`,
    data: requestSummary(order, type),
  });
};

/**
 * Sends the "return/replacement shipment aligned" e-mail (every environment).
 * @param {object} order Order with populated `userId` and `deliveryAddress`.
 * @param {'return' | 'replacement'} type
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown; only building the data can throw.
 */
const sendReturnShipmentEmail = async (order, type) => {
  await sendTemplateMail({
    emailModule: 'ORDER_RETURN_SHIPMENT',
    to: order.userId.email,
    subject: `${capitalizeFirstLetter(type)} is Aligned for Order #${order.orderId} - Pageaters`,
    data: requestSummary(order, type),
  });
};

/**
 * Sends the shopper-cancellation e-mail, in production only.
 * @param {object} order Order with populated `userId`.
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown.
 */
const sendCancelEmail = async (order) => {
  if (!environment.isProduction()) return;
  await sendTemplateMail({
    emailModule: 'CANCEL_ORDER',
    to: order.userId.email,
    subject: `Order ${order.orderId} Cancellation Confirmation  - Pageaters`,
    data: { ORDER_ID: order.orderId, FULL_NAME: readerName(order.userId) },
  });
};

/**
 * Sends the admin-cancellation e-mail, in production only and only when `notify` is truthy.
 * @param {object} order Order with populated `userId`.
 * @param {string} reason
 * @param {unknown} notify
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown.
 */
const sendAdminCancelEmail = async (order, reason, notify) => {
  if (!environment.isProduction() || !notify) return;
  await sendTemplateMail({
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
