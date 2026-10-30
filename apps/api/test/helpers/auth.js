const mongoose = require('mongoose');

// Fake accounts created the way the app creates them: the user model's own password hashing, the cart and
// favourites that signup creates, and a session token from the app's own JWT helper, stored (as its hash) like login stores it.

const PASSWORD = 'test-password-1';

let counter = 0;

/**
 * Creates an active, verified fake user and a session for it.
 * @param {{ role?: 'USER' | 'ADMIN', favorites?: boolean }} [options] `favorites: false` skips the favourites
 *   document that signup creates (to test accounts without one).
 * @returns {Promise<{ user: object, token: string, cookie: string, password: string }>} `cookie` is a ready
 *   `Cookie` header value.
 */
const createUser = async ({ role = 'USER', favorites = true } = {}) => {
  const { generateJwtToken, hashSessionToken } = require('../../src/helpers/encryption.helper');
  const { TOKEN_ID } = require('../../src/constants/enums');
  const User = mongoose.model('user');

  counter += 1;
  const n = String(counter).padStart(2, '0');
  const user = await User.create({
    fullName: `Test ${role === 'ADMIN' ? 'Admin' : 'Shopper'} ${n}`,
    email: `${role.toLowerCase()}-${n}@example.com`,
    contactNo: String(9000000000 + counter), // always 10 digits, 90000000xx-style
    role,
    emailVerified: true,
  });
  await user.setPassword(PASSWORD);

  await mongoose.model('cart').create({ user: user._id });
  if (favorites) await mongoose.model('favorites').create({ userId: user._id });

  const { token, payload } = generateJwtToken(user, '127.0.0.1');
  await mongoose.model('access_token').create({ ...payload, token: hashSessionToken(token) });

  return { user, token, cookie: `${TOKEN_ID.ACCESS_TOKEN_COOKIE}=${token}`, password: PASSWORD };
};

module.exports = { createUser, PASSWORD };
