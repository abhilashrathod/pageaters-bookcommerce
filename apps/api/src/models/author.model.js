const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { enums, models } = require('./../constants');

const schema = new Schema({
    authorId: { type: String, default: '' },

    name: { type: String, default: '' },
    intro: { type: String, default: '' },

    avatar: { type: String, default: '' },

    priority: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: String, default: '' },

    books: [{ type: Schema.Types.ObjectId, ref: models.STORE_BOOK }],
  },
  {
    timestamps: true,
  },
);

schema.plugin(mongoosePaginate);

module.exports = model(models.AUTHOR, schema);
