const { ENVIRONMENT } = require('../appConfig');

// The legacy "production only" notification gates (order confirmation e-mail and SMS, cancellation e-mails). The
// services call `environment.isProduction()` at send time instead of comparing APP_ENV at import, so tests can
// switch the gate on for one test (`t.mock.method(environment, 'isProduction', () => true)`); in the app it only
// ever reflects APP_ENV.
const environment = {
  /** @returns {boolean} Whether APP_ENV is `production`. */
  isProduction: () => ENVIRONMENT === 'production',
};

module.exports = environment;
