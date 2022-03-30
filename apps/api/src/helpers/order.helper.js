const mongoose = require('mongoose');
const axios = require('axios');
const colors = require('colors');
const { sumBy } = require('lodash');
const { DELHIVERY } = require('../appConfig');

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

module.exports.calculateTotalWeight = async function(products, bundles) {
  return new Promise(async (resolve, reject) => {
    try {
      let finalProductsWeight = sumBy(products, (obj) => (obj.product.weight * obj.quantity));
      let finalBundleWeight = 0;

      for (let bundleItem of bundles) {
        const bundleWeight = sumBy(bundleItem.bundledBooks, (obj) => obj.weight);
        finalBundleWeight = finalBundleWeight + (bundleWeight * bundleItem.quantity);
      }

      resolve(finalProductsWeight + finalBundleWeight)
    } catch (e) {
      console.log(colors.red("ERROR"), JSON.stringify(e));
      resolve(0);
    }
  })
};


module.exports.calculateShipping = async function(isFree, totalWeight, deliveryCode) {
  return new Promise(async (resolve, reject) => {
    try {

      if (isFree) {
        resolve({
          taxes: 0,
          deliveryAmount: 0,
          totalDeliveryCharges: 0,
        });
      }

      const config = {
        method: 'get',
        url: `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=${DELIVERY_MODE}&ss=${STATUS_OF_SHIPMENT}&d_pin=${deliveryCode}&o_pin=${ORIGIN_PIN_CODE}&cgm=${totalWeight}`,
        headers: {
          'Authorization': `Token ${AUTH_TOKEN}`,
        },
      };

      axios(config)
        .then(function (response) {
          const charges = response.data[0];

          const payload = {
            taxes: charges.tax_data.SGST + charges.tax_data.CGST,
            deliveryAmount: charges.gross_amount,
            totalDeliveryCharges: charges.total_amount,
          };

          resolve(payload);
        })
        .catch(function (error) {
          console.log(colors.red("ERROR"), error);
          resolve(0);
        });
    } catch (e) {
      console.log( colors.red("ERROR"), JSON.stringify(e));
      resolve(0);
    }
  });
};
