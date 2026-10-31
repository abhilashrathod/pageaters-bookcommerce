// The seeded demo accounts (seed/src/accounts.ts DEMO_SHOPPER_EMAIL, DEMO_ADMIN_EMAIL), signed into with one click in
// DEMO_MODE (POST /auth/demo-login, /auth/demo-login/admin). The demo admin is read-only there
// (middlewares/demoMode.middleware.js).
module.exports = {
  DEMO_SHOPPER_EMAIL: 'shopper@demo.pageaters.com',
  DEMO_ADMIN_EMAIL: 'admin@demo.pageaters.com',
};
