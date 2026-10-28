import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { adminEmptyDataSchema, adminOrderWithCustomerSchema, adminStockAlertSubscriberSchema, adminUserDetailsSchema } from './index.ts';

// The api-client's admin tests parse a fixture through every admin response schema; these check the guarantees.

const at = '2026-10-28T10:00:00.000Z';
const id = (n: number) => `64d0000000000000000000${n.toString().padStart(2, '0')}`;

const user = {
  _id: id(1),
  email: 'shopper@demo.pageaters.com',
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  dateOfBirth: '',
  gender: '',
  emailVerified: true,
  contactVerified: false,
  storeCredit: 0,
  lastLoginAt: at,
  lastPasswordSetAt: '',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: at,
  updatedAt: at,
};
const credentials = {
  password: 'placeholder-hash',
  salt: 'placeholder-salt',
  contactOtp: '000000',
  verifyEmailToken: 'placeholder-token',
  forgotPasswordToken: 'placeholder-token',
  razorPayCustId: 'cust_placeholder',
};

const address = {
  _id: id(2),
  userId: id(1),
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  email: 'shopper@demo.pageaters.com',
  addressLine1: '1 Example Street',
  addressLine2: '',
  landmark: '',
  city: 'Sampleton',
  state: 'Placeholder State',
  pinCode: '000000',
  country: 'IN',
  type: 'HOME',
  isDefault: true,
  isDeleted: false,
  deletedAt: '',
  createdAt: at,
  updatedAt: at,
};

const order = {
  _id: id(3),
  orderId: 'OD-0000000001',
  userId: { _id: id(1), fullName: 'Demo Shopper', email: 'shopper@demo.pageaters.com', contactNo: '9000000000' },
  orderStatus: 'shipped',
  orderDate: at,
  deliveryAddress: address,
  deliveryInstructions: '',
  shipmentTrackingId: 'https://tracking.example.test/1',
  products: [],
  bundles: [],
  addOns: [],
  boxes: [],
  rentals: [],
  orderHistory: [],
  requests: [],
  giftOptions: { isGift: false, details: { package: '', cost: 0, message: '', from: '' } },
  razorOrderId: 'order_placeholder',
  razorPaymentId: 'pay_placeholder',
  payment: { method: 'upi', upi_id: 'demo@upi' },
  giftCard: null,
  discount: null,
  storeCreditTransaction: null,
  subTotal: 499,
  shipping: 50,
  storeCredit: 0,
  total: 549,
  weight: 300,
  createdAt: at,
  updatedAt: at,
};

void describe('admin responses', () => {
  void it('strip credentials from the customer details view', () => {
    const parsed = adminUserDetailsSchema.parse({ user: { ...user, ...credentials }, cart: null, addresses: [address], orders: [] });
    for (const key of Object.keys(credentials)) assert.equal(key in (parsed.user ?? {}), false, key);
    assert.equal('isDeleted' in (parsed.addresses[0] ?? {}), false);
  });

  void it('reject the raw Razorpay payment entity on an admin order', () => {
    assert.ok(adminOrderWithCustomerSchema.safeParse(order).success);
    const raw = {
      id: 'pay_placeholder',
      entity: 'payment',
      method: 'upi',
      vpa: 'demo@upi',
      email: 'owner@example.com',
      contact: '9000000000',
    };
    assert.equal(adminOrderWithCustomerSchema.safeParse({ ...order, payment: raw }).success, false);
  });

  void it('drop the soft-delete flags from stock alerts', () => {
    const alert = { _id: id(4), user: null, product: null, isDeleted: false, deletedAt: '', createdAt: at, updatedAt: at };
    assert.deepEqual(Object.keys(adminStockAlertSubscriberSchema.parse(alert)).sort(), [
      '_id',
      'createdAt',
      'product',
      'updatedAt',
      'user',
    ]);
  });

  void it('treat acknowledgements as empty', () => {
    assert.ok(adminEmptyDataSchema.safeParse({}).success);
    assert.equal(adminEmptyDataSchema.safeParse({ success: true }).success, false);
  });
});
