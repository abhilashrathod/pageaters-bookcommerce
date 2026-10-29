const mongoose = require('mongoose');
const axios = require('axios');
const { map } = require('lodash');

const { models, enums } = require('../constants');
const { DELHIVERY, ENVIRONMENT } = require('../appConfig');
const { AppError } = require('../helpers/appError.helper');
const { getId } = require('../helpers/utils.helper');
const { sendReturnShipmentEmail, sendShippedEmail } = require('./order-notifications.service');

// Shipments: the forward shipment booked with Delhivery, and aligning the pickup/replacement shipment of a return
// or replacement request. The adapters step moves the Delhivery call behind the shipping adapter.

const Order = mongoose.model(models.ORDER);

/**
 * The warehouse Delhivery picks shipments up from: the demo office in development and staging, the demo warehouse
 * elsewhere (both fake demo addresses).
 * @returns {{ name: string, add: string, city: string, pin_code: string, country: string, phone: string }}
 */
const returnPickupAddress = () => {
  const demoAddress = {
    name: 'Pageaters Main Office',
    add: 'Unit 1, Demo Logistics Park, Sector 1',
    city: 'Gandhinagar',
    pin_code: '382016',
    country: 'India',
    phone: '9000000000',
  };

  const mainAddress = {
    name: 'PAGEATERS DEMO WAREHOUSE',
    add: 'Unit 1, Demo Logistics Park, Sector 1',
    city: 'Gandhinagar',
    pin_code: '382016',
    country: 'India',
    phone: '9000000000',
  };

  if (ENVIRONMENT === 'development' || ENVIRONMENT === 'staging') {
    return demoAddress;
  }

  return mainAddress;
};

const { PAID, CONFIRMED, SHIPPED, RETURNED, REPLACEMENT, RETURNED_IN_PROGRESS, REPLACEMENT_IN_PROGRESS } = enums.ORDER_STAGES;

const SHIPMENT_POPULATE = [
  { path: 'deliveryAddress' },
  { path: 'userId', select: 'fullName email contactNo' },
  { path: 'products.product', select: 'bookId title currentDiscount price' },
  { path: 'bundles.bundle', select: 'bundleId title bundledBooks currentDiscount price' },
  { path: 'addOns.addOn', select: 'name poster currentDiscount price' },
  { path: 'boxes.box', select: 'boxId title images currentDiscount price' },
];

// "Title x 2, Other," — each non-empty section ends with ", "; the whole is trimmed, so a trailing comma stays (legacy).
const section = (items, name) => {
  const text = map(items, (item) => `${name(item)}${item.quantity > 1 ? ' x ' + item.quantity : ''}`).join(', ');
  return text ? `${text}, ` : '';
};
const productsDescription = (order) =>
  `${section(order.products, (item) => item.product.title)}${section(order.bundles, (item) => item.bundle.title)}${section(order.boxes, (item) => item.box.title)}${section(order.addOns, (item) => item.addOn.name)}`.trim();

/**
 * Books a Delhivery surface shipment for a paid (prepaid) or confirmed (COD, collecting the total) order, ships the
 * order with the Delhivery tracking URL and e-mails the buyer.
 * Legacy (PLAN.md security step): the route is guarded only as USER, with no owner check — any shopper can ship any
 * paid order. Missing `dimensions` throws a TypeError (→ 500); a Delhivery network error rejects (→ 500).
 * @param {string} orderId Order `_id`.
 * @param {{ width: number, height: number, weight: number }} dimensions
 * @returns {Promise<object>} Delhivery's response body.
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no such paid/confirmed order), SHIPMENT_CREATE_ERROR (Delhivery
 *   refused; the order is unchanged).
 */
const createDelhiveryShipment = async (orderId, dimensions) => {
  const order = await Order.findOne({ _id: orderId, $or: [{ orderStatus: PAID }, { orderStatus: CONFIRMED }] }).populate(SHIPMENT_POPULATE);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const address = order.deliveryAddress;
  const isCod = order.orderStatus === CONFIRMED;
  const payload = {
    shipments: [
      {
        name: address.fullName,
        add: address.addressLine1 + ' ' + address.addressLine2 + ' ' + address.landmark,
        pin: address.pinCode,
        city: address.city,
        state: address.state,
        country: 'India',
        phone: address.contactNo,
        order: order.orderId,
        payment_mode: isCod ? 'COD' : 'Prepaid',
        products_desc: productsDescription(order),
        cod_amount: isCod ? order.total : '',
        total_amount: order.total,
        shipment_width: dimensions.width,
        shipment_height: dimensions.height,
        weight: dimensions.weight,
        shipping_mode: 'Surface',
        address_type: address.type.toLowerCase(),
      },
    ],
    pickup_location: returnPickupAddress(),
  };

  const { data: response } = await axios({
    method: 'post',
    url: `${DELHIVERY.BASE_URL}/api/cmu/create.json`,
    data: `format=json&data=${JSON.stringify(payload)}`,
    headers: {
      Authorization: `Token ${DELHIVERY.API_TOKEN}`,
      // axios 0.x sent this by default for string bodies; axios 1 does not.
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (!response.success) throw new AppError('SHIPMENT_CREATE_ERROR');

  order.orderStatus = SHIPPED;
  order.shipmentTrackingId = `https://www.delhivery.com/track/package/${response.packages[0].waybill}`;
  order.orderHistory.push({
    title: SHIPPED,
    description: 'Order hand over to shipment company. Your books are on their way',
    time: new Date().toISOString(),
  });
  await order.save();

  sendShippedEmail(order);
  return response;
};

/**
 * Admin: records the shipment for an open return (pickup) or replacement (new books): the order moves to
 * `return in progress` / `replacement in progress`, the request to `in progress` with the shipment id, and the buyer
 * gets the "aligned" e-mail. Legacy: an unknown request id updates nothing but still answers success and e-mails.
 * @param {string} id Order `_id`.
 * @param {string} requestId
 * @param {string} shipment Tracking id.
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (order not `returned`/`replacement`).
 */
const alignReturnShipment = async (id, requestId, shipment) => {
  const order = await Order.findOne({ $or: [{ orderStatus: RETURNED }, { orderStatus: REPLACEMENT }], _id: id }).populate([
    { path: 'userId', select: 'fullName email contactNo' },
    { path: 'deliveryAddress' },
  ]);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  const isReturn = order.orderStatus === RETURNED;
  const nextStatus = isReturn ? RETURNED_IN_PROGRESS : REPLACEMENT_IN_PROGRESS;
  const log = {
    title: nextStatus,
    description: isReturn
      ? 'Return has been processed and reverse shipment is aligned'
      : 'Replacement has been processed and shipment of new books has been created. They will be with you soon.',
    time: new Date().toISOString(),
  };

  await Order.findOneAndUpdate(
    { _id: id, 'requests._id': getId(requestId) },
    {
      $set: {
        orderStatus: nextStatus,
        shipmentTrackingId: shipment,
        'requests.$.status': enums.ORDER_REQUEST_STATUS.IN_PROGRESS,
        'requests.$.shipment': shipment,
      },
      $push: { orderHistory: log },
    },
    { new: true },
  );

  sendReturnShipmentEmail(order, isReturn ? 'return' : 'replacement');
};

module.exports = { alignReturnShipment, createDelhiveryShipment };
