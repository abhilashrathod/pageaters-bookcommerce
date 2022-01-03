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


module.exports.prepareProductsForOrder = async function(books) {
  return new Promise(async (resolve, reject) => {
    try {
      if (books.length === 0) {
        resolve([]);
      }

      let finalProducts = [];

      for (let book of books) {
        const selectionString = `currentDiscount price membersPrice`;
        const bookRes = await Book.findOne({ isDeleted: false, _id: book.product }).select(selectionString);

        if (book.quantity <= bookRes.inventory) {
          const item = {
            quantity: book.quantity,
            price: bookRes.price,
            discount: bookRes.currentDiscount,
            productTotal: book.quantity * (bookRes.price - ((bookRes.currentDiscount * bookRes.price) / 100)),
            product: book.product,
          };
          finalProducts.push(item);
        }

      }

      resolve(finalProducts);
    } catch (e) {
      resolve(null);
    }
  });
};


module.exports.calculateShipping = async function(isFree, totalWeight, deliveryCode) {
  return new Promise(async (resolve, reject) => {
    try {

      if (isFree) {
        resolve(0);
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
