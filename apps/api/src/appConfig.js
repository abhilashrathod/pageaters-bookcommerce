const config = require('config');

module.exports = {
  ENVIRONMENT: config.get('ENVIRONMENT') || '',
  PROJECT_ROOT: config.get('PROJECT_ROOT') || '',
  PROJECT_NAME: config.get('PROJECT_NAME') || '',
  PORT: config.get('PORT') || '',
  MONGODB_URL: config.get('MONGODB_URL') || '',
  ENCRYPTION_KEY: config.get('ENCRYPTION_KEY') || '',
  FCM_SERVER_KEY: config.get('FCM_SERVER_KEY') || '',
  AWS: config.get('AWS') || {},
  ENABLE_CRON: config.get('ENABLE_CRON'),
  SENDGRID_API_KEY: config.get('SENDGRID_API_KEY') || '',
  NO_REPLY_EMAIL: config.get('NO_REPLY_EMAIL') || '',
  CONTACT_US_EMAIL: config.get('CONTACT_US_EMAIL') || '',
  DEFAULT_LANGUAGE: config.get('DEFAULT_LANGUAGE') || '',
  AVAILABLE_LOCALES: config.get('AVAILABLE_LOCALES') || '',
  HOST: config.get('HOST') || '',
  API_URL: config.get('API_URL') || '',
  RAZOR_PAY_BASE_URL: config.get('RAZOR_PAY_BASE_URL') || '',
  RAZOR_PAY_USER_ID:  config.get('RAZOR_PAY_USER_ID') || '',
  RAZOR_PAY_PASSWORD: config.get('RAZOR_PAY_PASSWORD') || '',
  DELETE_ACCOUNT_DATA_AFTER: config.get('DELETE_ACCOUNT_DATA_AFTER') || '',
};
