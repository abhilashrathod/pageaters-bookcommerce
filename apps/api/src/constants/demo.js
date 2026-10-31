// The seeded demo accounts (seed/src/accounts.ts DEMO_SHOPPER_EMAIL, DEMO_ADMIN_EMAIL), signed into with one click in
// DEMO_MODE (POST /auth/demo-login, /auth/demo-login/admin). The demo admin is read-only there
// (middlewares/demoMode.middleware.js).
module.exports = {
  DEMO_SHOPPER_EMAIL: 'shopper@demo.pageaters.com',
  DEMO_ADMIN_EMAIL: 'admin@demo.pageaters.com',
  // The demo shopper's seeded address (seed/src/accounts.ts ACCOUNT_IDS.shopperAddress and its fields), which the
  // weekly cleanup puts back as seeded.
  DEMO_SHOPPER_ADDRESS_ID: '64d000000000000000000b01',
  DEMO_SHOPPER_ADDRESS: Object.freeze({
    fullName: 'Demo Shopper',
    contactNo: '9000000000',
    email: 'shopper@demo.pageaters.com',
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
  }),
};
