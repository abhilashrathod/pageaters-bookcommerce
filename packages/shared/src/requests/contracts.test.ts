import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { z } from 'zod';
import { adminReturnShipmentRequestSchema, adminShipmentCreateRequestSchema } from './admin/index.ts';
import {
  cartItemAddPayloadSchema,
  addressCreatePayloadSchema,
  addressPincodePayloadSchema,
  addressUpdatePayloadSchema,
  deleteAccountPayloadSchema,
  loginPayloadSchema,
  orderCancelPayloadSchema,
  orderCreatePayloadSchema,
  orderReturnPayloadSchema,
  orderStoreCreditPayloadSchema,
  resetPasswordPayloadSchema,
  revokeValidationPayloadSchema,
  verifyEmailPayloadSchema,
} from './index.ts';

// The request contracts Phase 4 tightened beyond the legacy Joi rules (requests.test.ts keeps the Joi-era tables),
// and the payloads of the routes that had no validator.

const ID = '64b7f0c2a1b2c3d4e5f60718';
const EMAIL = 'owner@example.com';
const ORDER = 'OD-0123456789';

const accepts = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  assert.ok(result.success, `${JSON.stringify(input)}: ${result.error?.issues[0]?.message ?? ''}`);
  return result.data;
};
const rejects = (schema: z.ZodType, input: unknown, code?: string) => {
  const result = schema.safeParse(input);
  assert.equal(result.success, false, JSON.stringify(input));
  if (code) assert.equal(result.error?.issues[0]?.message, code, JSON.stringify(input));
};

const validAddress = {
  fullName: 'Test Receiver',
  contactNo: '9000000000',
  email: EMAIL,
  city: 'Test City',
  state: 'Test State',
  pinCode: '560001',
  isDefault: false,
  addressLine1: '1 Example Street',
};

void describe('Phase 4 request contracts', () => {
  void it('lower-cases and trims emails', () => {
    assert.deepEqual(accepts(loginPayloadSchema, { email: ' Owner@Example.COM ', password: 'x' }), { email: EMAIL, password: 'x' });
  });

  void it('caps the password as sent at 128 characters, never trimming it', () => {
    const padded = `${' '.repeat(127)}x`;
    assert.equal((accepts(loginPayloadSchema, { email: EMAIL, password: padded }) as { password: string }).password, padded);
    rejects(loginPayloadSchema, { email: EMAIL, password: `${' '.repeat(128)}x` }, 'INVALID_PASSWORD');
    rejects(deleteAccountPayloadSchema, { password: 'p'.repeat(129) }, 'INVALID_PASSWORD');
    accepts(deleteAccountPayloadSchema, { password: 'p'.repeat(128) });
  });

  void it('caps tokens at 1024 characters', () => {
    accepts(verifyEmailPayloadSchema, { email: EMAIL, token: 't'.repeat(1024) });
    rejects(verifyEmailPayloadSchema, { email: EMAIL, token: 't'.repeat(1025) }, 'INVALID_TOKEN');
    const reset = { email: EMAIL, newPassword: 'p', confirmPassword: 'p' };
    rejects(resetPasswordPayloadSchema, { ...reset, token: 't'.repeat(1025) }, 'INVALID_RESET_PASSWORD_TOKEN');
    rejects(revokeValidationPayloadSchema, { token: 't'.repeat(1025) }, 'INVALID_TOKEN');
  });

  void it('requires a six-digit pin code', () => {
    accepts(addressPincodePayloadSchema, { pincode: ' 560001 ' });
    for (const pincode of ['56000', '5600011', 'abcdef', '56 001']) {
      rejects(addressPincodePayloadSchema, { pincode }, 'INVALID_PINCODE');
      rejects(addressCreatePayloadSchema, { ...validAddress, pinCode: pincode }, 'INVALID_PINCODE');
    }
  });

  void it('bounds the address text fields (after trimming)', () => {
    accepts(addressCreatePayloadSchema, { ...validAddress, fullName: ` ${'n'.repeat(100)} `, addressLine1: 'a'.repeat(200) });
    rejects(addressCreatePayloadSchema, { ...validAddress, fullName: 'n'.repeat(101) }, 'INVALID_NAME');
    rejects(addressCreatePayloadSchema, { ...validAddress, city: 'c'.repeat(101) }, 'INVALID_CITY');
    rejects(addressCreatePayloadSchema, { ...validAddress, state: 's'.repeat(101) }, 'INVALID_STATE');
    rejects(addressCreatePayloadSchema, { ...validAddress, addressLine1: 'a'.repeat(201) }, 'INVALID_ADD_1');
    rejects(addressCreatePayloadSchema, { ...validAddress, addressLine2: 'a'.repeat(201) }, 'INVALID_ADD_2');
    rejects(addressCreatePayloadSchema, { ...validAddress, landmark: 'l'.repeat(201) }, 'INVALID_LANDMARK');
  });

  void it('validates an address update: id required, every field optional, unknown keys dropped', () => {
    assert.deepEqual(accepts(addressUpdatePayloadSchema, { id: ID, city: ' New City ', country: 'IN', _id: ID }), {
      id: ID,
      city: 'New City',
    });
    rejects(addressUpdatePayloadSchema, { city: 'x' }, 'INVALID_ID');
    rejects(addressUpdatePayloadSchema, { id: ID, pinCode: '1' }, 'INVALID_PINCODE');
    rejects(addressUpdatePayloadSchema, { id: ID, email: 'nope' }, 'INVALID_EMAIL');
  });

  void it('bounds the gift details', () => {
    const order = (details: Record<string, unknown>) => ({ method: 'cod', giftOptions: { isGift: true, details } });
    accepts(orderCreatePayloadSchema, order({ package: 'p'.repeat(100), from: 'f'.repeat(100), message: 'm'.repeat(500) }));
    rejects(orderCreatePayloadSchema, order({ package: 'p'.repeat(101) }));
    rejects(orderCreatePayloadSchema, order({ from: 'f'.repeat(101) }));
    rejects(orderCreatePayloadSchema, order({ message: 'm'.repeat(501) }));
  });

  void it('store credit: rupees ≥ 0 with paise precision, bounded, for a well-formed order id', () => {
    accepts(orderStoreCreditPayloadSchema, { uniqueId: ORDER, amount: 0 });
    accepts(orderStoreCreditPayloadSchema, { uniqueId: ORDER, amount: 12.5 });
    accepts(orderStoreCreditPayloadSchema, { uniqueId: ORDER, amount: 599.25 });
    accepts(orderStoreCreditPayloadSchema, { uniqueId: ORDER, amount: 100_000 });
    rejects(orderStoreCreditPayloadSchema, { uniqueId: ORDER, amount: -1 }, 'STORE_CREDIT_NEGATIVE');
    for (const amount of ['5', null, undefined, 12.345, 100_000.01, Number.POSITIVE_INFINITY])
      rejects(orderStoreCreditPayloadSchema, { uniqueId: ORDER, amount }, 'INVALID_AMOUNT');
    rejects(orderStoreCreditPayloadSchema, { uniqueId: 'OD-1', amount: 1 }, 'ORDER_INFO_ATTEMPT_FAILED');
    rejects(orderStoreCreditPayloadSchema, { uniqueId: { $ne: null }, amount: 1 }, 'ORDER_INFO_ATTEMPT_FAILED');
  });

  void it('return requests: return or replace, bounded text and line ids', () => {
    const valid = { uniqueId: ORDER, type: 'return', reason: ' Damaged ', comments: 'Torn', books: [ID], bundles: [] };
    assert.deepEqual(accepts(orderReturnPayloadSchema, valid), { ...valid, reason: 'Damaged' });
    accepts(orderReturnPayloadSchema, { uniqueId: ORDER, type: 'replace' });
    for (const type of [undefined, 'cancel', 'RETURN'])
      rejects(orderReturnPayloadSchema, { uniqueId: ORDER, type }, 'ORDER_INFO_ATTEMPT_FAILED');
    rejects(orderReturnPayloadSchema, { ...valid, reason: 'r'.repeat(501) }, 'ORDER_INFO_ATTEMPT_FAILED');
    rejects(orderReturnPayloadSchema, { ...valid, comments: 'c'.repeat(1001) }, 'ORDER_INFO_ATTEMPT_FAILED');
    rejects(orderReturnPayloadSchema, { ...valid, books: ['nope'] }, 'INVALID_ID');
    rejects(orderReturnPayloadSchema, { ...valid, books: Array(101).fill(ID) });
    rejects(orderReturnPayloadSchema, { ...valid, orderStatus: 'returned' });
  });

  void it('caps the cart quantity at 100 and the gift cost at 1000', () => {
    accepts(cartItemAddPayloadSchema, { product: ID, quantity: 100 });
    rejects(cartItemAddPayloadSchema, { product: ID, quantity: 101 }, 'REQUIRED_QUANTITY');
    const gift = (cost: unknown) => ({ method: 'cod', giftOptions: { isGift: true, details: { cost } } });
    accepts(orderCreatePayloadSchema, gift(1000));
    rejects(orderCreatePayloadSchema, gift(1001));
  });

  void it('admin shipment routes check the path ids merged into the payload', () => {
    const dimensions = { width: 1, height: 1, weight: 1 };
    accepts(adminShipmentCreateRequestSchema, { orderId: ID, dimensions });
    rejects(adminShipmentCreateRequestSchema, { dimensions });
    rejects(adminShipmentCreateRequestSchema, { orderId: { $ne: 'x' }, dimensions });
    accepts(adminReturnShipmentRequestSchema, { id: ID, requestId: ID, shipment: 'PICKUP-1' });
    rejects(adminReturnShipmentRequestSchema, { id: ID, requestId: 'nope', shipment: 'PICKUP-1' }, 'INVALID_ID');
    rejects(adminReturnShipmentRequestSchema, { id: { $ne: 'x' }, requestId: ID, shipment: 'PICKUP-1' });
  });

  void it('cancel requests: optional bounded reason and comments', () => {
    accepts(orderCancelPayloadSchema, { uniqueId: ORDER });
    accepts(orderCancelPayloadSchema, { uniqueId: ORDER, reason: 'Changed mind', comments: 'Test' });
    rejects(orderCancelPayloadSchema, { uniqueId: ORDER, reason: 'r'.repeat(501) }, 'ORDER_INFO_ATTEMPT_FAILED');
    rejects(orderCancelPayloadSchema, { uniqueId: 'nope' }, 'ORDER_INFO_ATTEMPT_FAILED');
    rejects(orderCancelPayloadSchema, { uniqueId: ORDER, status: 'cancelled' });
  });
});
