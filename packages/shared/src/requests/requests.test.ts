import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { z } from 'zod';
import {
  addressCreatePayloadSchema,
  addressGetPayloadSchema,
  addressPincodePayloadSchema,
  cartAddOnAddPayloadSchema,
  cartItemAddPayloadSchema,
  checkoutMethodSchema,
  favoritesRequestPayloadSchema,
  forgotPasswordPayloadSchema,
  loginPayloadSchema,
  orderAttemptPayloadSchema,
  orderCreatePayloadSchema,
  registerPayloadSchema,
  resendVerificationEmailPayloadSchema,
  resetPasswordPayloadSchema,
  revokeValidationPayloadSchema,
  sendVerifyContactPayloadSchema,
  subscriberRootPayloadSchema,
  updatePasswordPayloadSchema,
  updateProfilePayloadSchema,
  verifyContactPayloadSchema,
  verifyEmailPayloadSchema,
} from './index.ts';

// One table per legacy Joi schema. Each case states the expected result:
//   { input, output } → accepted; the parsed value equals `output` (after JSON round-trip, so absent = undefined)
//   { input, code }   → rejected; the first issue's message is the Joi error code
//   { input, rejects: true } → rejected; Joi had no code for it (it sent its own English text)
// Until the API dropped Joi (Phase 4), the same tables also ran through its Joi validators and both agreed; `file`
// and `joiExport` name the validator each table was checked against.

type Case = { input: Record<string, unknown> } & ({ output: unknown } | { code: string } | { rejects: true });
type Table = { file: string; joiExport: string; schema: z.ZodType; cases: Case[] };

const ID = '64b7f0c2a1b2c3d4e5f60718';
const EMAIL = 'owner@example.com';
const PHONE = '9000000000';

const validAddress = {
  fullName: 'Demo Shopper',
  contactNo: PHONE,
  email: 'shopper@demo.pageaters.com',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560001',
  isDefault: true,
  addressLine1: '1 Example Street',
};

const tables: Table[] = [
  {
    file: 'cart',
    joiExport: 'cartItemAddPayload',
    schema: cartItemAddPayloadSchema,
    cases: [
      { input: { product: ID, quantity: 2 }, output: { product: ID, quantity: 2 } },
      { input: { product: ID }, output: { product: ID, quantity: 1 } },
      { input: { product: ID, quantity: ' 3 ' }, output: { product: ID, quantity: 3 } },
      { input: { product: ID, quantity: '1e1' }, output: { product: ID, quantity: 10 } },
      { input: {}, code: 'INVALID_ID' },
      { input: { product: ID, quantity: 0 }, code: 'REQUIRED_QUANTITY' },
      { input: { product: ID, quantity: 1.5 }, code: 'REQUIRED_QUANTITY' },
      { input: { product: ID, quantity: null }, code: 'REQUIRED_QUANTITY' },
      { input: { product: ID, quantity: '' }, code: 'REQUIRED_QUANTITY' },
      { input: { product: ID, quantity: '0x10' }, code: 'REQUIRED_QUANTITY' },
      { input: { product: ID, quantity: true }, code: 'REQUIRED_QUANTITY' },
      { input: { product: ID, quantity: 1e20 }, code: 'REQUIRED_QUANTITY' },
      { input: { product: 'xx' }, code: 'INVALID_ID' },
      { input: { product: 42 }, code: 'INVALID_ID' },
      { input: { product: ` ${ID}` }, code: 'INVALID_ID' },
      { input: { foo: 1, product: 'xx' }, code: 'INVALID_ID' },
      { input: { product: ID, foo: 1 }, rejects: true },
    ],
  },
  {
    file: 'cart',
    joiExport: 'cartAddOnAddPayload (new; the legacy route had no validator)',
    schema: cartAddOnAddPayloadSchema,
    cases: [
      { input: { addOn: ID, quantity: 3 }, output: { addOn: ID, quantity: 3 } },
      { input: { addOn: ID }, output: { addOn: ID, quantity: 1 } },
      { input: { addOn: ID, quantity: '2' }, output: { addOn: ID, quantity: 2 } },
      { input: {}, code: 'INVALID_ID' },
      { input: { addOn: 'xx' }, code: 'INVALID_ID' },
      { input: { addOn: ID, quantity: 0 }, code: 'REQUIRED_QUANTITY' },
      { input: { addOn: ID, quantity: 'two' }, code: 'REQUIRED_QUANTITY' },
      { input: { addOn: ID, product: ID }, rejects: true },
    ],
  },
  {
    file: 'favorites',
    joiExport: 'requestPayload',
    schema: favoritesRequestPayloadSchema,
    cases: [
      { input: { product: ID.toUpperCase() }, output: { product: ID.toUpperCase() } },
      { input: {}, code: 'INVALID_ID' },
      { input: { product: '' }, code: 'INVALID_ID' },
      { input: { product: `${ID}0` }, code: 'INVALID_ID' },
      { input: { product: ID, _: '1' }, rejects: true },
    ],
  },
  {
    file: 'subscriber',
    joiExport: 'rootPayload',
    schema: subscriberRootPayloadSchema,
    cases: [
      { input: { email: EMAIL }, output: { email: EMAIL } },
      { input: { email: ` ${EMAIL}\t` }, output: { email: EMAIL } },
      { input: { email: 'Owner@Example.COM' }, output: { email: 'owner@example.com' } },
      { input: { email: 'owner+books@example.com' }, output: { email: 'owner+books@example.com' } },
      { input: { email: 'owner@example' }, output: { email: 'owner@example' } },
      { input: { email: 'owner@example.co.in' }, output: { email: 'owner@example.co.in' } },
      { input: { email: 'owner@xn--exmple-cua.com' }, output: { email: 'owner@xn--exmple-cua.com' } },
      { input: { email: "o!#$%&'*+/=?^_`{|}~-r@example.com" }, output: { email: "o!#$%&'*+/=?^_`{|}~-r@example.com" } },
      { input: { email: 'ownér@exämple.com' }, output: { email: 'ownér@exämple.com' } },
      { input: {}, code: 'INVALID_EMAIL' },
      { input: { email: '' }, code: 'INVALID_EMAIL' },
      { input: { email: 7 }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner' }, code: 'INVALID_EMAIL' },
      { input: { email: '@example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@' }, code: 'INVALID_EMAIL' },
      { input: { email: 'own er@example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'own..er@example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: '.owner@example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner.@example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@-example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@example-.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@exa_mple.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@example..com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@example.com.' }, code: 'INVALID_EMAIL' },
      { input: { email: 'owner@ex@ample.com' }, code: 'INVALID_EMAIL' },
      { input: { email: 'own(er)@example.com' }, code: 'INVALID_EMAIL' },
      { input: { email: `owner@${'x'.repeat(64)}.com` }, code: 'INVALID_EMAIL' },
      { input: { email: `${'o'.repeat(39)}@example.com` }, code: 'INVALID_EMAIL' },
      { input: { email: `${'o'.repeat(38)}@example.com` }, output: { email: `${'o'.repeat(38)}@example.com` } },
    ],
  },
  {
    file: 'auth',
    joiExport: 'registerPayload',
    schema: registerPayloadSchema,
    cases: [
      { input: { email: EMAIL, password: 'secret' }, output: { email: EMAIL, password: 'secret' } },
      {
        input: { email: EMAIL, password: 'secret', fullName: '' },
        output: { email: EMAIL, password: 'secret', fullName: '' },
      },
      {
        input: { email: EMAIL, password: 'secret', fullName: ' Demo ' },
        output: { email: EMAIL, password: 'secret', fullName: ' Demo ' },
      },
      { input: { email: EMAIL, password: 'p'.repeat(50) }, output: { email: EMAIL, password: 'p'.repeat(50) } },
      { input: { password: 'secret' }, code: 'INVALID_EMAIL' },
      { input: { email: EMAIL }, code: 'INVALID_PASSWORD' },
      { input: { email: EMAIL, password: '' }, code: 'INVALID_PASSWORD' },
      { input: { email: EMAIL, password: '   ' }, code: 'INVALID_PASSWORD' },
      { input: { email: EMAIL, password: 'p'.repeat(51) }, code: 'INVALID_PASSWORD' },
      { input: { email: EMAIL, password: 12345678 }, code: 'INVALID_PASSWORD' },
      { input: { email: EMAIL, password: 'secret', fullName: 'n'.repeat(51) }, code: 'INVALID_NAME' },
      { input: { email: EMAIL, password: 'secret', fullName: null }, code: 'INVALID_NAME' },
      { input: { email: 'bad', password: '' }, code: 'INVALID_EMAIL' },
      { input: { email: EMAIL, password: 'secret', role: 'ADMIN' }, rejects: true },
    ],
  },
  {
    file: 'auth',
    joiExport: 'verifyEmail',
    schema: verifyEmailPayloadSchema,
    cases: [
      { input: { email: EMAIL, token: ' abc ' }, output: { email: EMAIL, token: 'abc' } },
      { input: { email: EMAIL }, code: 'INVALID_TOKEN' },
      { input: { email: EMAIL, token: '  ' }, code: 'INVALID_TOKEN' },
      { input: { token: 'abc' }, code: 'INVALID_EMAIL' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'sendVerifyContact',
    schema: sendVerifyContactPayloadSchema,
    cases: [
      { input: { contactNo: PHONE }, output: { contactNo: PHONE } },
      { input: { contactNo: ` ${PHONE} ` }, output: { contactNo: PHONE } },
      { input: {}, code: 'INVALID_PHONE' },
      { input: { contactNo: '' }, code: 'INVALID_PHONE' },
      { input: { contactNo: 9000000000 }, code: 'INVALID_PHONE' },
      { input: { contactNo: '900000000' }, code: 'INVALID_PHONE' },
      { input: { contactNo: '90000000000' }, code: 'INVALID_PHONE' },
      { input: { contactNo: '900000000a' }, code: 'INVALID_PHONE' },
      { input: { contactNo: '+919000000000' }, code: 'INVALID_PHONE' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'verifyContact',
    schema: verifyContactPayloadSchema,
    cases: [
      { input: { otp: '123456' }, output: { otp: '123456' } },
      { input: { otp: ' 123456' }, output: { otp: '123456' } },
      { input: {}, code: 'INVALID_OTP' },
      { input: { otp: 123456 }, code: 'INVALID_OTP' },
      { input: { otp: '12345' }, code: 'INVALID_OTP' },
      { input: { otp: '12345a' }, code: 'INVALID_OTP' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'login',
    schema: loginPayloadSchema,
    cases: [
      { input: { email: EMAIL, password: 'secret' }, output: { email: EMAIL, password: 'secret' } },
      { input: { email: EMAIL }, code: 'INVALID_PASSWORD' },
      { input: { email: 'owner@', password: 'secret' }, code: 'INVALID_EMAIL' },
      { input: { email: EMAIL, password: 'secret', remember: true }, rejects: true },
    ],
  },
  {
    file: 'auth',
    joiExport: 'updatePassword',
    schema: updatePasswordPayloadSchema,
    cases: [
      {
        input: { password: 'old', newPassword: 'new', confirmPassword: 'other' },
        output: { password: 'old', newPassword: 'new', confirmPassword: 'other' },
      },
      { input: { password: 'old', newPassword: 'new' }, code: 'INVALID_PASSWORD' },
      { input: { password: 'old', newPassword: '', confirmPassword: 'new' }, code: 'INVALID_PASSWORD' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'forgotPassword',
    schema: forgotPasswordPayloadSchema,
    cases: [
      { input: { email: EMAIL }, output: { email: EMAIL } },
      { input: {}, code: 'INVALID_EMAIL' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'resetPassword',
    schema: resetPasswordPayloadSchema,
    cases: [
      {
        input: { token: 't', email: EMAIL, newPassword: 'new', confirmPassword: 'new' },
        output: { token: 't', email: EMAIL, newPassword: 'new', confirmPassword: 'new' },
      },
      { input: { email: EMAIL, newPassword: 'new', confirmPassword: 'new' }, code: 'INVALID_RESET_PASSWORD_TOKEN' },
      { input: { token: '', email: EMAIL, newPassword: 'new', confirmPassword: 'new' }, code: 'INVALID_RESET_PASSWORD_TOKEN' },
      { input: { token: 't', newPassword: 'new', confirmPassword: 'new' }, code: 'INVALID_EMAIL' },
      { input: { token: 't', email: EMAIL, newPassword: 'new' }, code: 'INVALID_PASSWORD' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'updateProfile',
    schema: updateProfilePayloadSchema,
    cases: [
      { input: {}, output: {} },
      { input: { fullName: 'Demo' }, output: { fullName: 'Demo' } },
      // The number changes only through the OTP flow (POST /auth/contact/send), never here.
      { input: { fullName: 'Demo', contactNo: PHONE }, rejects: true },
      { input: { contactNo: '' }, rejects: true },
      { input: { fullName: null }, code: 'INVALID_NAME' },
      { input: { email: EMAIL }, rejects: true },
    ],
  },
  {
    file: 'auth',
    joiExport: 'resendVerificationEmail',
    schema: resendVerificationEmailPayloadSchema,
    cases: [
      { input: { email: EMAIL }, output: { email: EMAIL } },
      { input: { email: 'x' }, code: 'INVALID_EMAIL' },
    ],
  },
  {
    file: 'auth',
    joiExport: 'revokeValidation',
    schema: revokeValidationPayloadSchema,
    cases: [
      { input: {}, output: {} },
      { input: { token: '' }, output: {} },
      { input: { token: 'abc' }, output: { token: 'abc' } },
      { input: { token: ' ' }, output: { token: ' ' } },
      { input: { token: null }, rejects: true },
      { input: { token: 1 }, rejects: true },
    ],
  },
  {
    file: 'address',
    joiExport: 'createPayload',
    schema: addressCreatePayloadSchema,
    cases: [
      { input: validAddress, output: validAddress },
      {
        input: { ...validAddress, isDefault: 'TRUE', addressLine2: '', landmark: ' Park ', type: 'OFFICE' },
        output: { ...validAddress, isDefault: true, addressLine2: '', landmark: 'Park', type: 'OFFICE' },
      },
      { input: { ...validAddress, city: ' Bengaluru ' }, output: validAddress },
      { input: { ...validAddress, addressLine2: '   ' }, output: { ...validAddress, addressLine2: '' } },
      { input: { ...validAddress, isDefault: 'false' }, output: { ...validAddress, isDefault: false } },
      { input: { ...validAddress, fullName: undefined }, code: 'INVALID_NAME' },
      { input: { ...validAddress, fullName: '  ' }, code: 'INVALID_NAME' },
      { input: { ...validAddress, contactNo: '123' }, code: 'INVALID_PHONE' },
      { input: { ...validAddress, email: undefined }, code: 'INVALID_EMAIL' },
      { input: { ...validAddress, city: '' }, code: 'INVALID_CITY' },
      { input: { ...validAddress, state: undefined }, code: 'INVALID_STATE' },
      { input: { ...validAddress, pinCode: 560001 }, code: 'INVALID_PINCODE' },
      { input: { ...validAddress, isDefault: undefined }, code: 'INVALID_DEFAULT_SELECTION' },
      { input: { ...validAddress, isDefault: 'yes' }, code: 'INVALID_DEFAULT_SELECTION' },
      { input: { ...validAddress, isDefault: 1 }, code: 'INVALID_DEFAULT_SELECTION' },
      { input: { ...validAddress, addressLine1: '' }, code: 'INVALID_ADD_1' },
      { input: { ...validAddress, addressLine2: null }, code: 'INVALID_ADD_2' },
      { input: { ...validAddress, landmark: 3 }, code: 'INVALID_LANDMARK' },
      { input: { ...validAddress, city: '', isDefault: 'yes' }, code: 'INVALID_CITY' },
      { input: { ...validAddress, type: 'home' }, rejects: true },
      { input: { ...validAddress, country: 'IN' }, rejects: true },
    ],
  },
  {
    file: 'address',
    joiExport: 'getPayload',
    schema: addressGetPayloadSchema,
    cases: [
      { input: { id: ID }, output: { id: ID } },
      { input: {}, code: 'INVALID_ID' },
      { input: { id: 'nope' }, code: 'INVALID_ID' },
    ],
  },
  {
    file: 'address',
    joiExport: 'pincodePayload',
    schema: addressPincodePayloadSchema,
    cases: [
      { input: { pincode: ' 560001 ' }, output: { pincode: '560001' } },
      { input: { pincode: 'abc' }, code: 'INVALID_PINCODE' },
      { input: {}, code: 'INVALID_PINCODE' },
      { input: { pincode: '' }, code: 'INVALID_PINCODE' },
    ],
  },
  {
    file: 'order',
    joiExport: 'orderAttempt',
    schema: orderAttemptPayloadSchema,
    cases: [
      { input: { address: ID }, output: { address: ID } },
      { input: {}, code: 'INVALID_ID' },
      { input: { address: 'nope' }, code: 'INVALID_ID' },
      { input: { address: ID, coupon: 'X' }, rejects: true },
    ],
  },
  {
    file: 'order',
    joiExport: 'orderCreate',
    schema: orderCreatePayloadSchema,
    cases: [
      { input: { method: 'cod' }, output: { method: 'cod' } },
      { input: { method: ' online ', instructions: '   ' }, output: { method: 'online', instructions: '' } },
      {
        input: { method: 'online', instructions: ' Leave at door ', giftOptions: { isGift: false } },
        output: { method: 'online', instructions: 'Leave at door', giftOptions: { isGift: false } },
      },
      {
        input: { method: 'cod', giftOptions: { isGift: 'true', details: { from: ' A ', message: '' } } },
        output: { method: 'cod', giftOptions: { isGift: true, details: { from: 'A', message: '', cost: 0 } } },
      },
      {
        input: { method: 'cod', giftOptions: { isGift: true, details: { package: 'box', cost: '30' } } },
        output: { method: 'cod', giftOptions: { isGift: true, details: { package: 'box', cost: 30 } } },
      },
      { input: { method: 'cod', instructions: 'i'.repeat(100) }, output: { method: 'cod', instructions: 'i'.repeat(100) } },
      { input: {}, code: 'INVALID_PAYMENT_METHOD' },
      { input: { method: '' }, code: 'INVALID_PAYMENT_METHOD' },
      { input: { method: 'COD' }, code: 'INVALID_PAYMENT_METHOD' },
      { input: { method: 'card' }, code: 'INVALID_PAYMENT_METHOD' },
      { input: { method: 'cod', instructions: 'i'.repeat(101) }, code: 'INVALID_INSTRUCTIONS' },
      { input: { method: 'cod', instructions: 5 }, code: 'INVALID_INSTRUCTIONS' },
      { input: { method: 'cod', giftOptions: {} }, code: 'INVALID_DEFAULT_SELECTION' },
      { input: { method: 'cod', giftOptions: { isGift: 'x' } }, code: 'INVALID_DEFAULT_SELECTION' },
      { input: { method: 'cod', giftOptions: { isGift: true, details: { cost: 'a' } } }, rejects: true },
      { input: { method: 'cod', giftOptions: { isGift: true, details: { cost: -1 } } }, rejects: true },
      { input: { method: 'cod', giftOptions: { isGift: true, details: { package: 1 } } }, rejects: true },
      { input: { method: 'cod', giftOptions: { isGift: true, extra: 1 } }, rejects: true },
      { input: { method: 'cod', giftOptions: 'yes' }, rejects: true },
      { input: { method: 'cod', total: 1 }, rejects: true },
    ],
  },
];

const caseName = (table: Table, input: unknown) => `${table.joiExport} ${JSON.stringify(input)}`;
const jsonRoundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

void describe('request payload schemas', () => {
  for (const table of tables) {
    void it(`${table.file}.${table.joiExport}`, () => {
      for (const testCase of table.cases) {
        const result = table.schema.safeParse(testCase.input);
        const name = caseName(table, testCase.input);
        if ('output' in testCase) {
          assert.ok(result.success, `${name}: ${result.error?.issues[0]?.message ?? ''}`);
          assert.deepEqual(jsonRoundTrip(result.data), testCase.output, name);
        } else {
          assert.equal(result.success, false, name);
          if ('code' in testCase) assert.equal(result.error?.issues[0]?.message, testCase.code, name);
        }
      }
    });
  }

  void it('keeps the password as sent while checking its trimmed length', () => {
    const parsed = loginPayloadSchema.parse({ email: EMAIL, password: ' secret ' });
    assert.equal(parsed.password, ' secret ');
    const tooLong = ` ${'p'.repeat(50)} `;
    assert.equal(loginPayloadSchema.safeParse({ email: EMAIL, password: tooLong }).success, true);
  });

  void it('checkoutMethodSchema accepts exactly cod and online', () => {
    assert.deepEqual(checkoutMethodSchema.options, ['cod', 'online']);
  });
});
