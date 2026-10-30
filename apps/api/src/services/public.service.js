const { returnProductImage, returnBundleImage } = require('../helpers/image-url.helper');
const { sendTemplateMail } = require('./mail.service');

// Unauthenticated public endpoints (POST /public/contactUs).

// The ORDER_CONFIRMATION template's variables: the only payload keys passed on as template data.
const TEMPLATE_KEYS = [
  'ORDER_ID',
  'ORDER_DATE',
  'FULL_NAME',
  'PRODUCTS',
  'BUNDLES',
  'BOXES',
  'SUBTOTAL',
  'SHIPPING',
  'STORE_CREDIT',
  'GIFT_CHARGES',
  'TOTAL',
  'ADDRESS',
];

/**
 * Sends an ORDER_CONFIRMATION email to the shop address with the request payload as template data, after
 * rewriting each product and bundle poster to its image-resizer URL (the payload objects are changed in place).
 * Only the template's own keys (TEMPLATE_KEYS) are passed on, so request keys such as `settings` never reach the
 * renderer.
 * Legacy: unauthenticated mail trigger with request-chosen template data (removed or guarded in the security
 * step); `PRODUCTS` and `BUNDLES` must be arrays of `{ product }` / `{ bundle }`, anything else is a 500.
 * @param {object} payload Template data: `ORDER_ID`, `PRODUCTS`, `BUNDLES`, …
 * @returns {Promise<void>} A failed send is logged by mail.service, never thrown.
 */
const sendContactMail = async (payload) => {
  for (const productItem of payload.PRODUCTS) {
    productItem.product.poster = returnProductImage(productItem.product.poster);
  }
  for (const bundleItem of payload.BUNDLES) {
    bundleItem.bundle.poster = returnBundleImage(bundleItem.bundle.poster);
  }

  await sendTemplateMail({
    emailModule: 'ORDER_CONFIRMATION',
    to: 'owner@example.com',
    subject: `Order Confirmation #${payload.ORDER_ID} - Pageaters`,
    data: Object.fromEntries(TEMPLATE_KEYS.filter((key) => Object.hasOwn(payload, key)).map((key) => [key, payload[key]])),
  });
};

module.exports = { sendContactMail };
