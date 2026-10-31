const mongoose = require('mongoose');

const { models, enums } = require('../constants');
const { AppError } = require('../helpers/appError.helper');
const { getId } = require('../helpers/utils.helper');
const { cancelOrder } = require('./order-cancellation.service');
const { transitionOrder } = require('./order-transition.service');
const { adminOrderView } = require('./order-queries.service');
const { sendAdminCancelEmail, sendDeliveredEmail, sendShippedEmail } = require('./order-notifications.service');

// Admin status transitions. The full map, with the other services' transitions:
//
//   attempted ─ create(online) → created ─ payment webhook → paid ┐
//   attempted ─ create(cod) → confirmed ──────────────────────────┤
//   paid | confirmed ─ ship / Delhivery shipment → shipped ─ complete → fulfilled
//   paid | confirmed ─ shopper or admin cancel → cancelled (never after shipping; store credit applied to the order
//     is spent like a coupon: neither a cancel nor a refund gives it back)
//   fulfilled ─ return request → returned ─ align pickup → return in progress ─ close → returned
//   fulfilled ─ replace request → replacement ─ align → replacement in progress ─ close → fulfilled
//   any (with a Razorpay order) ─ refund webhook → refunded
//
// A transition from any other stage is refused with ORDER_INFO_ATTEMPT_FAILED (a cancel of a shipped or later order
// with ORDER_CANCEL_INVALID).

const Order = mongoose.model(models.ORDER);

const { PAID, CONFIRMED, SHIPPED, FULFILLED, CANCELLED, RETURNED, RETURNED_IN_PROGRESS, REPLACEMENT, REPLACEMENT_IN_PROGRESS } = enums.ORDER_STAGES;
const SHIPPED_OR_LATER = [SHIPPED, FULFILLED, RETURNED, RETURNED_IN_PROGRESS, REPLACEMENT, REPLACEMENT_IN_PROGRESS];
const BUYER = { path: 'userId', select: 'fullName email contactNo' };
const BUYER_AND_ADDRESS = [BUYER, { path: 'deliveryAddress' }];

const historyEntry = (title, description) => ({ title, description, time: new Date().toISOString() });

/**
 * Admin: hands a paid or confirmed order to the courier with a tracking id and e-mails the buyer.
 * @param {string} orderId Order `_id`.
 * @param {string} shipmentTrackingId
 * @returns {Promise<object>} The shipped order, buyer and address populated, `payment` as the summary (adminOrderView).
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no such order in `paid`/`confirmed`), ORDER_CHANGED_CONFLICT (409, it
 *   changed meanwhile, e.g. a cancel landed: nothing is shipped).
 */
const shipOrder = async (orderId, shipmentTrackingId) => {
  const order = await Order.findOne({ _id: orderId, $or: [{ orderStatus: PAID }, { orderStatus: CONFIRMED }] }).populate(BUYER_AND_ADDRESS);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  await transitionOrder(order, {
    set: { orderStatus: SHIPPED, shipmentTrackingId },
    history: historyEntry(SHIPPED, 'Order hand over to shipment company. Your books are on their way'),
  });

  await sendShippedEmail(order);
  return adminOrderView(order);
};

/**
 * Admin: marks a shipped order delivered (`fulfilled`) and e-mails the buyer.
 * @param {string} id Order `_id`.
 * @returns {Promise<object>} The order, buyer and address populated, `payment` as the summary (adminOrderView).
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED (no such order in `shipped`), ORDER_CHANGED_CONFLICT (409, it changed
 *   meanwhile, e.g. a full refund landed).
 */
const completeShipment = async (id) => {
  const order = await Order.findOne({ _id: id, orderStatus: SHIPPED }).populate(BUYER_AND_ADDRESS);
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  await transitionOrder(order, { set: { orderStatus: FULFILLED }, history: historyEntry(FULFILLED, 'Shipment delivered. Happy reading!') });

  await sendDeliveredEmail(order);
  return adminOrderView(order);
};

/**
 * Admin: cancels a paid or confirmed order (like the shopper's cancel, never after shipping), logs the reason as its
 * history, e-mails the buyer (production, when `notify`) and puts the stock back (order-cancellation.service.js).
 * Store credit applied to the order is spent and stays spent. No refund is started.
 * Legacy: the order is found by `uniqueId` and `userId` from the body; the route's `:id` is ignored.
 * @param {{ uniqueId?: string, userId?: string, reason?: string, notify?: unknown }} request
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_CANCEL_INVALID (shipped or later), ORDER_INFO_ATTEMPT_FAILED (no such paid/confirmed order),
 *   ORDER_CHANGED_CONFLICT (409, it changed meanwhile)
 */
const cancelByAdmin = async ({ uniqueId, userId, reason, notify }) => {
  const order = await Order.findOne({ orderId: uniqueId, userId }).populate([BUYER]);
  if (order && SHIPPED_OR_LATER.includes(order.orderStatus)) throw new AppError('ORDER_CANCEL_INVALID');
  if (!order || ![PAID, CONFIRMED].includes(order.orderStatus)) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  await cancelOrder(order, { history: historyEntry(CANCELLED, reason), notify: () => sendAdminCancelEmail(order, reason, notify) });
};

// Closes one return/replacement request: the order moves to `nextStatus` and its tracking id is cleared. An unknown
// request id updates nothing and is not an error (legacy).
const closeRequest = async (id, requestId, fromStatus, nextStatus, log) => {
  const order = await Order.findOne({ _id: id, orderStatus: fromStatus });
  if (!order) throw new AppError('ORDER_INFO_ATTEMPT_FAILED');

  await Order.findOneAndUpdate(
    { _id: id, 'requests._id': getId(requestId) },
    {
      $set: {
        orderStatus: nextStatus,
        shipmentTrackingId: '',
        'requests.$.status': enums.ORDER_REQUEST_STATUS.CLOSED,
        'requests.$.shipment': '',
      },
      $push: { orderHistory: log },
    },
    { new: true },
  );
};

/**
 * Admin: the returned books arrived. `return in progress` → `returned` (legacy: back to `returned`; the refund
 * webhook moves it to `refunded`). No e-mail.
 * @param {string} id Order `_id`.
 * @param {string} requestId
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED
 */
const closeReturnRequest = (id, requestId) =>
  closeRequest(
    id,
    requestId,
    RETURNED_IN_PROGRESS,
    RETURNED,
    historyEntry('Return Success', 'Return has been completed from our side. Refund will be issued soon.'),
  );

/**
 * Admin: the replacement was delivered. `replacement in progress` → `fulfilled`. No e-mail.
 * @param {string} id Order `_id`.
 * @param {string} requestId
 * @returns {Promise<void>}
 * @throws {AppError} ORDER_INFO_ATTEMPT_FAILED
 */
const closeReplaceRequest = (id, requestId) =>
  closeRequest(
    id,
    requestId,
    REPLACEMENT_IN_PROGRESS,
    FULFILLED,
    historyEntry('Replacement Success', 'Replacement has been completed with a fresh set of books. Happy Reading!'),
  );

module.exports = { cancelByAdmin, closeReplaceRequest, closeReturnRequest, completeShipment, shipOrder };
