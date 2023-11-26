const mongoose = require('mongoose');
const axios = require('axios');
const Buffer = require('buffer');
const colors = require('colors');
const { sumBy, get } = require('lodash');
const { ENVIRONMENT, DELHIVERY, AWS } = require('../appConfig');

const { models, enums } = require('../constants');
const Book = mongoose.model(models.STORE_BOOK);

const DELIVERY_MODE = `S`;
const STATUS_OF_SHIPMENT = `Delivered`;
const ORIGIN_PIN_CODE = `382016`;

const AUTH_TOKEN = `***REMOVED***`;

module.exports.checkServiceabilityInternal = async function(pincode) {
  return new Promise(async (resolve, reject) => {

    try {
      const config = {
        method: 'get',
        url: `${DELHIVERY.BASE_URL}/c/api/pin-codes/json?filter_codes=${pincode}&token=${DELHIVERY.API_TOKEN}`,
        headers: {},
      };

      const apiRes = await axios(config);
      const pincodeRes = await apiRes.data.delivery_codes[0];

      if (pincodeRes) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (e) {
      resolve(false);
    }
  });
};

module.exports.calculateTotalWeight = async function(products, bundles, mysteryBoxes) {
  return new Promise(async (resolve, reject) => {
    try {
      let finalProductsWeight = sumBy(products, (obj) => (obj.product.weight * obj.quantity));
      let finalBundleWeight = sumBy(bundles, (obj) => (obj.bundle.weight * obj.quantity));
      let finalBoxWeight = sumBy(mysteryBoxes, (obj) => (obj.box.weight * obj.quantity));

      const totalWeight = Number(finalProductsWeight) + Number(finalBundleWeight) + Number(finalBoxWeight);

      resolve(totalWeight);
    } catch (e) {
      console.log(colors.red('ERROR'), JSON.stringify(e));
      resolve(0);
    }
  });
};

module.exports.calculateConvenienceFees = async function(subtotal) {
  return new Promise(async (resolve, reject) => {
    try {
      if (subtotal < 500) {
        resolve(30);
      }

      if (subtotal >= 500 && subtotal <= 999) {
        resolve(40);
      }

      if (subtotal >= 1000) {
        resolve(50);
      }

      resolve(0);
    } catch (e) {
      console.log(colors.red('ERROR'), JSON.stringify(e));
      resolve(0);
    }
  });
};

module.exports.calculateShipping = async function(isFree, hasMysteryBox) {
  return new Promise(async (resolve, reject) => {
    try {

      if (isFree) {
        resolve({
          taxes: 0,
          deliveryAmount: 0,
          totalDeliveryCharges: 0,
        });
      }

      if (hasMysteryBox) {
        resolve({
          taxes: 0,
          deliveryAmount: 125,
          totalDeliveryCharges: 125,
        });
      }

      resolve({
        taxes: 0,
        deliveryAmount: 50,
        totalDeliveryCharges: 50,
      });
    } catch (e) {
      console.log(colors.red('ERROR'), JSON.stringify(e));
      resolve(0);
    }
  });
};

module.exports.returnPickupAddress = function() {
  const demoAddress = {
    name: 'Pageaters Main Office',
    add: 'Unit 1, Demo Logistics Park, Sector 1',
    city: 'Gandhinagar',
    pin_code: '382016',
    country: 'India',
    phone: '9000000000',
  };

  const NimawatMarketingAddress = {
    name: "Demo Supplier",
    add: "Unit 1, Demo Logistics Park, Sector 1",
    city: "Udaipur",
    pin_code: "313001",
    country: "India",
    phone: "9000000000",
  }

  const mainAddress = {
    name: 'PAGEATERS DEMO WAREHOUSE',
    add: 'Unit 1, Demo Logistics Park, Sector 1',
    city: 'Gandhinagar',
    pin_code: '382016',
    country: 'India',
    phone: '9000000000',
  };

  if (ENVIRONMENT === 'development' || ENVIRONMENT === 'staging') {
    return demoAddress;
  }

  return mainAddress;
}

module.exports.orderPaymentInfo = function(payment) {
  let payload;

  switch (payment.method) {
    case enums.PAYMENT_METHODS.CARD:
      payload = {
        method: enums.PAYMENT_METHODS.CARD,
        name: get(payment, 'card.name', ''),
        last4: get(payment, 'card.last4', ''),
        network: get(payment, 'card.network', ''),
      };
      return payload;

    case enums.PAYMENT_METHODS.NET_BAKING:
      payload = {
        method: enums.PAYMENT_METHODS.NET_BAKING,
        bank: get(payment, 'bank', ''),
      };
      return payload;


    case enums.PAYMENT_METHODS.UPI:
      payload = {
        method: enums.PAYMENT_METHODS.UPI,
        upi_id: get(payment, 'vpa', ''),
      };
      return payload;

    case enums.PAYMENT_METHODS.WALLET:
      payload = {
        method: enums.PAYMENT_METHODS.WALLET,
        wallet: get(payment, 'wallet', ''),
      };
      return payload;

    case enums.PAYMENT_METHODS.EMI:
      payload = {
        method: enums.PAYMENT_METHODS.EMI,
        name: get(payment, 'emi.issuer', ''),
        last4: get(payment, 'emi.rate', ''),
        network: get(payment, 'emi.duration', ''),
      };
      return payload;

    case enums.PAYMENT_METHODS.COD:
      payload = {
        method: enums.PAYMENT_METHODS.COD
      };
      return payload;
    default:
      return payload;
  }
};

module.exports.textMessage = function(name, email, orderId) {
  return `Hi ${name ? name : email.split('@')[0]}, Your order#${orderId} has been confirmed! Track your order progress in Account > Orders section. Happy Reading! -- Team Pageaters.`;
};

module.exports.returnAddressName = function(name, email) {
  return `${name ? name : email.split('@')[0]}`;
};

module.exports.returnProductImage = function(name, height = 110, width = 75) {
  const imageRequest = JSON.stringify({
    bucket: enums.BUCKETS.BOOK,
    key: name,
    edits: {
      resize: {
        height,
        width,
        fit: 'cover',
      }
    }
  });

  return `${AWS.CLOUDFRONT_ACCESS_POINT}/${universalBtoa(imageRequest)}`;
};

module.exports.returnBundleImage = function(name) {
  const imageRequest = JSON.stringify({
    bucket: enums.BUCKETS.BUNDLES,
    key: name,
    edits: {
      resize: {
        height: 75,
        width: 75,
        fit: 'cover',
      }
    }
  });

  return `${AWS.CLOUDFRONT_ACCESS_POINT}/${universalBtoa(imageRequest)}`;
};

module.exports.returnCollectionImage = function(name) {
  const imageRequest = JSON.stringify({
    bucket: enums.BUCKETS.COLLECTIONS,
    key: name,
    edits: {
      resize: {
        height: 75,
        width: 75,
        fit: 'cover',
      }
    }
  });

  return `${AWS.CLOUDFRONT_ACCESS_POINT}/${universalBtoa(imageRequest)}`;
};

module.exports.returnCategoryImage = function(name) {
  const imageRequest = JSON.stringify({
    bucket: enums.BUCKETS.CATEGORIES,
    key: name,
    edits: {
      resize: {
        height: 75,
        width: 75,
        fit: 'cover',
      }
    }
  });

  return `${AWS.CLOUDFRONT_ACCESS_POINT}/${universalBtoa(imageRequest)}`;
};

module.exports.returnAssetImage = function(name) {
  const imageRequest = JSON.stringify({
    bucket: enums.BUCKETS.ASSETS,
    key: name,
    edits: {
      resize: {
        height: 75,
        width: 75,
        fit: 'cover',
      }
    }
  });

  return `${AWS.CLOUDFRONT_ACCESS_POINT}/${universalBtoa(imageRequest)}`;
};

function universalBtoa(str) {
  try {
    return btoa(str);
  } catch (err) {
    return Buffer.from(str).toString('base64');
  }
}

