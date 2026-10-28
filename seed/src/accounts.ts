import { createHmac, randomBytes } from 'node:crypto';

import type { Doc } from './sanitise.ts';

// Demo accounts for the API's users collection, built when the seed is loaded (never written to seed/data):
// - demo shopper: the storefront's one-click "Continue as demo shopper" (Phase 5); random password nobody uses
// - demo admin: the read-only admin login shown to visitors (read-only from Phase 5); random password
// - super-admin: the owner's own login, from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in apps/api/.env
// The API only knows the USER and ADMIN roles until Phase 5, so the accounts are told apart by their fixed IDs and
// emails. Fixed IDs make re-seeding update the same documents.

export const DEMO_SHOPPER_EMAIL = 'shopper@demo.pageaters.com';
export const DEMO_ADMIN_EMAIL = 'admin@demo.pageaters.com';

export const ACCOUNT_IDS = {
  shopper: '64d000000000000000000a01',
  demoAdmin: '64d000000000000000000a02',
  superAdmin: '64d000000000000000000a03',
  shopperAddress: '64d000000000000000000b01',
  shopperCart: '64d000000000000000000c01',
  shopperFavorites: '64d000000000000000000d01',
} as const;

// Same as the API's User#setPassword: a 16-character hex salt and an HMAC-SHA512 of the password keyed by it.
export function hashPassword(password: string, salt: string): string {
  return createHmac('sha512', salt).update(password).digest('hex');
}

const newSalt = () => randomBytes(8).toString('hex');
// Written by the seed loader, not Mongoose, so timestamps are set here (admin lists sort by createdAt).
const stamps = () => {
  const now = { $date: new Date().toISOString() };
  return { createdAt: now, updatedAt: now };
};
// For accounts that log in without a password (one-click demo logins).
const unusablePassword = () => randomBytes(32).toString('base64url');

export interface AccountEnv {
  SUPER_ADMIN_EMAIL?: string | undefined;
  SUPER_ADMIN_PASSWORD?: string | undefined;
}

// Checks the owner's settings without ever echoing them. The API's login validator caps email and password at 50
// characters and looks the email up as typed, so the email is stored lowercase (log in with it in lowercase).
export function superAdminFrom(env: AccountEnv): { email: string; password: string } {
  const email = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = env.SUPER_ADMIN_PASSWORD ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('SUPER_ADMIN_EMAIL is missing or not an email address (apps/api/.env)');
  if (email.endsWith('@demo.pageaters.com')) throw new Error('SUPER_ADMIN_EMAIL must be your own address, not a demo one');
  if (email.length > 50) throw new Error('SUPER_ADMIN_EMAIL must be at most 50 characters (the API login rejects longer)');
  if (password.length < 12 || password.length > 50) {
    throw new Error('SUPER_ADMIN_PASSWORD must be 12–50 characters (the API login rejects longer) (apps/api/.env)');
  }
  return { email, password };
}

function user(id: string, fields: { email: string; fullName: string; role: 'USER' | 'ADMIN'; password: string; contactNo?: string }): Doc {
  const salt = newSalt();
  return {
    _id: { $oid: id },
    email: fields.email,
    fullName: fields.fullName,
    contactNo: fields.contactNo ?? '',
    role: fields.role,
    status: 'ACTIVE',
    emailVerified: true,
    contactVerified: true,
    salt,
    password: hashPassword(fields.password, salt),
    lastPasswordSetAt: new Date().toISOString(),
    isDeleted: false,
    ...stamps(),
  };
}

export function buildAccounts(env: AccountEnv): { users: Doc[]; addresses: Doc[]; carts: Doc[]; favorites: Doc[] } {
  const owner = superAdminFrom(env);
  return {
    users: [
      user(ACCOUNT_IDS.shopper, {
        email: DEMO_SHOPPER_EMAIL,
        fullName: 'Demo Shopper',
        role: 'USER',
        password: unusablePassword(),
        contactNo: '9000000000',
      }),
      user(ACCOUNT_IDS.demoAdmin, { email: DEMO_ADMIN_EMAIL, fullName: 'Demo Admin', role: 'ADMIN', password: unusablePassword() }),
      user(ACCOUNT_IDS.superAdmin, { email: owner.email, fullName: 'Super Admin', role: 'ADMIN', password: owner.password }),
    ],
    // A saved address so checkout works straight away; fictional, with the placeholder phone number.
    addresses: [
      {
        _id: { $oid: ACCOUNT_IDS.shopperAddress },
        userId: { $oid: ACCOUNT_IDS.shopper },
        fullName: 'Demo Shopper',
        contactNo: '9000000000',
        email: DEMO_SHOPPER_EMAIL,
        addressLine1: '42 Demo Lane',
        addressLine2: 'Indiranagar',
        landmark: 'Near the demo bookshop',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560038',
        country: 'IN',
        type: 'HOME',
        isDefault: true,
        isDeleted: false,
        deletedAt: '',
        ...stamps(),
      },
    ],
    // Signup creates an empty cart and favourites for every shopper; the cart and wishlist endpoints need them.
    carts: [
      {
        _id: { $oid: ACCOUNT_IDS.shopperCart },
        user: { $oid: ACCOUNT_IDS.shopper },
        products: [],
        addOns: [],
        bundles: [],
        mysteryBoxes: [],
        subTotal: 0,
        isDeleted: false,
        deletedAt: '',
        ...stamps(),
      },
    ],
    favorites: [
      {
        _id: { $oid: ACCOUNT_IDS.shopperFavorites },
        userId: { $oid: ACCOUNT_IDS.shopper },
        wishlist: [],
        deals: [],
        collections: [],
        bundles: [],
        ...stamps(),
      },
    ],
  };
}
