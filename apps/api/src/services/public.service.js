const sendMailQueue = require('../helpers/sendMailQueue.helper');
const { returnProductImage, returnBundleImage } = require('../helpers/image-url.helper');

// Unauthenticated public endpoints (POST /public/contactUs).

/**
 * Queues an ORDER_CONFIRMATION email to the shop address with the request payload as template data, after
 * rewriting each product and bundle poster to its image-resizer URL (the payload objects are changed in place).
 * Legacy: unauthenticated mail trigger with request-chosen template data (removed or guarded in the security
 * step); `PRODUCTS` and `BUNDLES` must be arrays of `{ product }` / `{ bundle }`, anything else is a 500.
 * @param {object} payload Template data: `ORDER_ID`, `PRODUCTS`, `BUNDLES`, …
 * @returns {void}
 */
const sendContactMail = (payload) => {
  for (const productItem of payload.PRODUCTS) {
    productItem.product.poster = returnProductImage(productItem.product.poster);
  }
  for (const bundleItem of payload.BUNDLES) {
    bundleItem.bundle.poster = returnBundleImage(bundleItem.bundle.poster);
  }

  sendMailQueue.add({
    emailModule: 'ORDER_CONFIRMATION',
    to: 'owner@example.com',
    subject: `Order Confirmation #${payload.ORDER_ID} - Pageaters`,
    data: payload,
  });
};

module.exports = { sendContactMail };
