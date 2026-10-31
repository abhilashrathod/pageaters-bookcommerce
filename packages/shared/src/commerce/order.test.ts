import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OrderRequestStatus, OrderRequestType, OrderStatus } from '../enums.ts';
import { customerOrderListItemSchema, customerOrderSchema, orderPaymentSchema, orderSchema } from './order.ts';

const id = (n: number) => `64d0000000000000000${String(n).padStart(5, '0')}`;
const now = '2026-10-28T10:00:00.000Z';
const preferences = { preferredAuthors: '', preferredGenres: 'Fantasy', favoriteBooks: '', ignoredBooks: '' };

const order = {
  _id: id(1),
  orderId: 'OD-1234567890',
  userId: id(2),
  orderStatus: OrderStatus.FULFILLED,
  orderDate: now,
  deliveryAddress: id(3),
  deliveryInstructions: '',
  shipmentTrackingId: '',
  products: [{ _id: id(10), product: id(11), quantity: 2, price: 399, discount: 15, productTotal: 678.3, weight: 600 }],
  bundles: [{ _id: id(12), bundle: id(13), quantity: 1, price: 999, discount: 10, total: 899.1, weight: 1200 }],
  addOns: [{ _id: id(14), addOn: id(15), quantity: 1, price: 49, discount: 0, total: 49 }],
  boxes: [{ _id: id(16), box: id(17), quantity: 1, price: 799, discount: 0, total: 799, weight: 900, preferences }],
  rentals: [],
  orderHistory: [{ _id: id(20), title: OrderStatus.CONFIRMED, description: 'We have received your order.', time: now }],
  requests: [
    {
      _id: id(21),
      type: OrderRequestType.RETURN,
      date: now,
      info: { reason: 'Damaged', comments: '' },
      status: OrderRequestStatus.OPEN,
      shipment: '',
      books: [id(11)],
      bundles: [],
    },
  ],
  giftOptions: { isGift: false, details: { package: '', cost: 0, message: '', from: '' } },
  razorOrderId: '',
  razorPaymentId: '',
  payment: { method: 'cod' },
  giftCard: null,
  discount: null,
  storeCreditTransaction: null,
  subTotal: 2425,
  shipping: 0,
  storeCredit: 100,
  total: 2325,
  weight: 2700,
  createdAt: now,
  updatedAt: now,
};

const withRequest = (patch: Record<string, unknown>) => ({ ...order, requests: [{ ...order.requests[0], ...patch }] });

void describe('orderSchema', () => {
  void it('accepts a complete order', () => {
    const result = orderSchema.safeParse(order);
    assert.ok(result.success, JSON.stringify(result.error?.issues));
  });

  void it('accepts every order status and rejects the model default "" and unknown statuses', () => {
    for (const status of Object.values(OrderStatus)) assert.ok(orderSchema.safeParse({ ...order, orderStatus: status }).success, status);
    for (const status of ['', 'pending', 'PAID'])
      assert.equal(orderSchema.safeParse({ ...order, orderStatus: status }).success, false, status);
  });

  void it('accepts every request type and status and rejects others', () => {
    for (const type of Object.values(OrderRequestType)) assert.ok(orderSchema.safeParse(withRequest({ type })).success, type);
    for (const status of Object.values(OrderRequestStatus)) assert.ok(orderSchema.safeParse(withRequest({ status })).success, status);
    for (const type of ['', 'replacement', 'refund']) assert.equal(orderSchema.safeParse(withRequest({ type })).success, false, type);
    for (const status of ['', 'done']) assert.equal(orderSchema.safeParse(withRequest({ status })).success, false, status);
  });

  void it('rejects negative money on the order and on its lines', () => {
    for (const field of ['subTotal', 'shipping', 'storeCredit', 'total']) {
      assert.equal(orderSchema.safeParse({ ...order, [field]: -1 }).success, false, field);
    }
    const negativeLine = { ...order, products: [{ ...order.products[0], price: -399 }] };
    assert.equal(orderSchema.safeParse(negativeLine).success, false);
    const negativeGift = { ...order, giftOptions: { isGift: true, details: { ...order.giftOptions.details, cost: -50 } } };
    assert.equal(orderSchema.safeParse(negativeGift).success, false);
  });

  void it('treats the line discount as a percentage', () => {
    assert.equal(orderSchema.safeParse({ ...order, products: [{ ...order.products[0], discount: 120 }] }).success, false);
  });

  void it('allows an attempted order without a date or payment yet', () => {
    assert.ok(orderSchema.safeParse({ ...order, orderStatus: OrderStatus.ATTEMPTED, orderDate: '', payment: null }).success);
  });
});

void describe('orderPaymentSchema', () => {
  void it('accepts the per-method summaries the API sends the owner', () => {
    for (const payment of [
      { method: 'cod' },
      { method: 'card', name: 'Demo Shopper', last4: '1111', network: 'Visa' },
      { method: 'upi', upi_id: 'shopper@upi' },
      { method: 'netbanking', bank: 'HDFC' },
      { method: 'wallet', wallet: 'paytm' },
      { method: 'emi', name: 'HDFC', last4: 12, network: 6 },
    ]) {
      assert.ok(orderPaymentSchema.safeParse(payment).success, payment.method);
    }
  });

  void it('rejects a raw Razorpay payment entity and unknown methods', () => {
    const raw = { id: 'pay_placeholder', method: 'card', card: { last4: '1111' }, email: 'shopper@demo.pageaters.com' };
    assert.equal(orderPaymentSchema.safeParse(raw).success, false);
    assert.equal(orderPaymentSchema.safeParse({ method: 'bitcoin' }).success, false);
  });
});

void describe('customerOrderSchema', () => {
  void it('drops the Razorpay IDs and requests from the owner view', () => {
    const parsed = customerOrderSchema.parse(order);
    for (const key of ['razorOrderId', 'razorPaymentId', 'requests', 'userId']) assert.equal(key in parsed, false, key);
  });

  void it('keeps the refund bookkeeping in the admin view only', () => {
    const refunded = { ...order, refundIds: ['rfnd_placeholder'] };
    assert.deepEqual(orderSchema.parse(refunded).refundIds, ['rfnd_placeholder']);
    assert.equal('refundIds' in customerOrderSchema.parse(refunded), false);
  });

  void it('accepts a missing payment and rejects a raw Razorpay entity, as orderSchema does', () => {
    const { payment: _payment, ...withoutPayment } = order;
    assert.ok(customerOrderSchema.safeParse(withoutPayment).success);
    assert.ok(orderSchema.safeParse(withoutPayment).success);
    const raw = { ...order, payment: { id: 'pay_placeholder', method: 'card', card: { last4: '1111' } } };
    assert.equal(customerOrderSchema.safeParse(raw).success, false);
    assert.equal(orderSchema.safeParse(raw).success, false);
  });
});

void describe('customerOrderListItemSchema', () => {
  const listItem = {
    _id: order._id,
    orderId: order.orderId,
    orderDate: order.orderDate,
    deliveryAddress: order.deliveryAddress,
    orderStatus: order.orderStatus,
    shipmentTrackingId: order.shipmentTrackingId,
    products: order.products,
    boxes: order.boxes,
    bundles: order.bundles,
    total: order.total,
  };

  void it('accepts exactly the fields GET /orders/list selects', () => {
    assert.deepEqual(customerOrderListItemSchema.parse(order), listItem);
  });

  void it('rejects a list item without its total or with a negative one', () => {
    const { total: _total, ...withoutTotal } = listItem;
    assert.equal(customerOrderListItemSchema.safeParse(withoutTotal).success, false);
    assert.equal(customerOrderListItemSchema.safeParse({ ...listItem, total: -1 }).success, false);
  });
});
