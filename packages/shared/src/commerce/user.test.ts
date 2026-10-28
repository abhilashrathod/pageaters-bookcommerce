import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { userSchema } from './user.ts';

const profile = {
  _id: '64d000000000000000000a01',
  email: 'shopper@demo.pageaters.com',
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  dateOfBirth: '',
  gender: '',
  emailVerified: true,
  contactVerified: true,
  storeCredit: 150,
  lastLoginAt: '2026-10-28T10:00:00.000Z',
  lastPasswordSetAt: '',
};

void describe('userSchema', () => {
  void it('accepts the profile the API sends (getProfile) and the admin view with role and timestamps', () => {
    assert.ok(userSchema.safeParse(profile).success);
    const admin = {
      ...profile,
      role: 'USER',
      status: 'ACTIVE',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    };
    assert.ok(userSchema.safeParse(admin).success);
  });

  void it('strips every credential field from a full Mongoose document', () => {
    const fullDocument = {
      ...profile,
      id: profile._id,
      salt: 'placeholder-salt',
      password: 'placeholder-hash',
      contactOtp: '123456',
      verifyEmailToken: 'placeholder-token',
      forgotPasswordToken: 'placeholder-token',
      lastForgotPasswordSentOn: '',
      lastVerifyEmailSentOn: '',
      lastMessageSentOn: '',
      razorPayCustId: 'cust_placeholder',
      isDeleted: false,
      __v: 0,
    };
    const parsed = userSchema.parse(fullDocument);
    for (const key of [
      'id',
      'salt',
      'password',
      'contactOtp',
      'verifyEmailToken',
      'forgotPasswordToken',
      'lastForgotPasswordSentOn',
      'lastVerifyEmailSentOn',
      'lastMessageSentOn',
      'razorPayCustId',
      'isDeleted',
      '__v',
    ]) {
      assert.equal(key in parsed, false, key);
    }
    assert.deepEqual(parsed, profile);
  });

  void it('rejects an unknown role, a malformed phone and a negative store credit balance', () => {
    assert.equal(userSchema.safeParse({ ...profile, role: 'ROOT' }).success, false);
    assert.equal(userSchema.safeParse({ ...profile, contactNo: '12345' }).success, false);
    assert.equal(userSchema.safeParse({ ...profile, storeCredit: -1 }).success, false);
    assert.ok(userSchema.safeParse({ ...profile, contactNo: '' }).success);
  });
});
