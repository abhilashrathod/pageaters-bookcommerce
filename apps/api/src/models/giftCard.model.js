const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { models } = require('./../constants');

const schema = new Schema({
  giftCardId: { type: String, default: '' },
});

schema.plugin(mongoosePaginate);

module.exports = model(models.GIFT_CARD, schema);
