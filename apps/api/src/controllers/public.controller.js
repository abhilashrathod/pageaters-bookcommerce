const { CONTACT_US_EMAIL } = require('./../appConfig');

const sendMailQueue = require('./../helpers/sendMailQueue.helper');
const { returnProductImage, returnBundleImage } = require('../helpers/order.helper');

module.exports.contactUs = async (req, res) => {
  try {
    const payload = req.allParams();

    console.log("JSON", JSON.stringify(payload));
    payload.PRODUCTS = returnProducts(payload.PRODUCTS);
    payload.BUNDLES = returnBundles(payload.BUNDLES);
    console.log("JSON", JSON.stringify(payload));
    sendMailQueue.add({
      emailModule: 'ORDER_CONFIRMATION',
      to: 'owner@example.com',
      subject: `Order Confirmation #${payload.ORDER_ID} - Pageaters`,
      data: payload,
    });

    return res.ok('MAIL_SENT');
  } catch (e) {
    return res.internalServerError(e);
  }
};


function returnProducts(products) {
  for (let productItem of products) {
    productItem.product.poster = returnProductImage(productItem.product.poster);
  }

  return products;
}

function returnBundles(bundles) {
  for (let bundleItem of bundles) {
    bundleItem.bundle.poster = returnBundleImage(bundleItem.bundle.poster);
  }

  return bundles;
}
